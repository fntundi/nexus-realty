import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all contacts
    const contacts = await base44.asServiceRole.entities.Contact.list();
    
    // Get all interactions
    const interactions = await base44.asServiceRole.entities.Interaction.list();

    const results = [];

    for (const contact of contacts) {
      // Calculate interaction score (max 40 points)
      const contactInteractions = interactions.filter(i => i.contact_id === contact.id);
      const interactionScore = Math.min(
        contactInteractions.length * 5 + // 5 points per interaction
        (contactInteractions.filter(i => i.interaction_type === 'meeting').length * 5) + // 5 bonus per meeting
        (contactInteractions.filter(i => i.outcome === 'action_taken').length * 3), // 3 bonus per completed action
        40
      );

      // Calculate demographic score (max 30 points)
      let demographicScore = 0;
      if (contact.contact_type === 'buyer' || contact.contact_type === 'seller') {
        demographicScore += 15; // High priority contact types
      }
      if (contact.status === 'active') {
        demographicScore += 10;
      } else if (contact.status === 'prospect') {
        demographicScore += 5;
      }
      demographicScore = Math.min(demographicScore, 30);

      // Calculate engagement score (max 30 points)
      let engagementScore = 0;
      
      // Recent interaction (within 7 days) = 10 points
      if (contact.last_interaction_date) {
        const daysSinceInteraction = Math.floor(
          (new Date() - new Date(contact.last_interaction_date)) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceInteraction <= 7) {
          engagementScore += 10;
        } else if (daysSinceInteraction <= 30) {
          engagementScore += 5;
        }
      }

      // Related transactions/leads = 10 points each
      engagementScore += Math.min(
        (contact.related_transaction_ids?.length || 0) * 5 +
        (contact.related_lead_ids?.length || 0) * 5,
        15
      );

      // Has notes = 5 points
      if (contact.notes) {
        engagementScore += 5;
      }

      engagementScore = Math.min(engagementScore, 30);

      // Calculate total score (max 100)
      const totalScore = Math.round(interactionScore + demographicScore + engagementScore);

      // Update contact with new score
      const updated = await base44.asServiceRole.entities.Contact.update(contact.id, {
        lead_score: totalScore,
        score_breakdown: {
          interaction_score: interactionScore,
          demographic_score: demographicScore,
          engagement_score: engagementScore
        },
        score_history: [
          ...(contact.score_history || []),
          {
            score: totalScore,
            calculated_date: new Date().toISOString(),
            breakdown: {
              interaction_score: interactionScore,
              demographic_score: demographicScore,
              engagement_score: engagementScore
            }
          }
        ].slice(-30), // Keep last 30 scores
        last_score_update: new Date().toISOString()
      });

      results.push({
        contact_id: contact.id,
        contact_name: `${contact.first_name} ${contact.last_name}`,
        score: totalScore,
        breakdown: {
          interaction_score: interactionScore,
          demographic_score: demographicScore,
          engagement_score: engagementScore
        }
      });
    }

    return Response.json({
      status: 'success',
      message: `Updated scores for ${results.length} contacts`,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});