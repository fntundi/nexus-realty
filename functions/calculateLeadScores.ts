import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admins can bulk calculate scores
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { model_id, contact_id } = await req.json();

    // Get scoring model
    const model = await base44.entities.LeadScoringModel.get(model_id);
    if (!model || !model.is_active) {
      return Response.json({ error: 'Model not found or inactive' }, { status: 404 });
    }

    // Get contact
    const contact = contact_id 
      ? await base44.entities.Contact.get(contact_id)
      : null;

    if (contact_id && !contact) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Calculate score(s)
    if (contact) {
      const score = calculateScore(contact, model);
      return Response.json({
        success: true,
        contact_id,
        score,
        breakdown: scoreBreakdown(contact, model)
      });
    } else {
      // Score all contacts
      const contacts = await base44.entities.Contact.list();
      const results = contacts.map(c => ({
        contact_id: c.id,
        contact_name: `${c.first_name} ${c.last_name}`,
        score: calculateScore(c, model)
      }));

      // Update contacts with new scores (with error handling)
      const updatePromises = contacts.map(async (contact) => {
        try {
          const score = calculateScore(contact, model);
          await base44.asServiceRole.entities.Contact.update(contact.id, {
            lead_score: score,
            last_score_update: new Date().toISOString()
          });
          return { success: true, contact_id: contact.id };
        } catch (error) {
          console.error(`Failed to update contact ${contact.id}:`, error);
          return { success: false, contact_id: contact.id, error: error.message };
        }
      });
      
      const updateResults = await Promise.allSettled(updatePromises);
      const successCount = updateResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failureCount = updateResults.length - successCount;

      return Response.json({
        success: true,
        contacts_scored: successCount,
        failures: failureCount,
        results: results.sort((a, b) => b.score - a.score)
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateScore(contact, model) {
  let totalScore = 0;

  if (!model.scoring_factors || model.scoring_factors.length === 0) {
    return 0;
  }

  for (const factor of model.scoring_factors) {
    const fieldValue = contact[factor.field_name];

    if (fieldValue === undefined || fieldValue === null) {
      continue;
    }

    // Check if condition is met
    if (evaluateCondition(fieldValue, factor.condition)) {
      totalScore += factor.points * (factor.weight || 1);
    }
  }

  // Normalize to max score
  const normalizedScore = Math.min(
    totalScore,
    model.max_score || 100
  );

  return Math.round(normalizedScore);
}

function evaluateCondition(fieldValue, condition) {
  const value = fieldValue;
  const compareValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(value).toLowerCase() === String(compareValue).toLowerCase();

    case 'contains':
      return String(value).toLowerCase().includes(String(compareValue).toLowerCase());

    case 'greater_than':
      return Number(value) > Number(compareValue);

    case 'less_than':
      return Number(value) < Number(compareValue);

    case 'in_range':
      const [min, max] = String(compareValue).split('-').map(Number);
      return Number(value) >= min && Number(value) <= max;

    default:
      return false;
  }
}

function scoreBreakdown(contact, model) {
  const breakdown = {};

  for (const factor of model.scoring_factors) {
    const fieldValue = contact[factor.field_name];

    if (fieldValue === undefined || fieldValue === null) {
      breakdown[factor.factor_name] = 0;
      continue;
    }

    if (evaluateCondition(fieldValue, factor.condition)) {
      breakdown[factor.factor_name] = factor.points * (factor.weight || 1);
    } else {
      breakdown[factor.factor_name] = 0;
    }
  }

  return breakdown;
}