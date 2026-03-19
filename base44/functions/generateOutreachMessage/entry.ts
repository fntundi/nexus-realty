import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId, messageType = 'follow_up' } = await req.json();

    // Fetch transaction and related data
    const transaction = await base44.asServiceRole.entities.Transaction.get(transactionId);
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const lead = await base44.asServiceRole.entities.Lead.get(transaction.lead_id).catch(() => null);
    const property = await base44.asServiceRole.entities.Property.get(transaction.property_id).catch(() => null);
    const contact = await base44.asServiceRole.entities.Contact.filter({ 
      email: transaction.buyer_email 
    }).then(c => c[0]).catch(() => null);

    const interactions = await base44.asServiceRole.entities.Interaction.filter({ 
      related_transaction_id: transactionId 
    }, '-interaction_date').catch(() => []);

    // Build context
    const outreachContext = {
      stage: transaction.current_stage,
      buyerName: contact?.first_name || 'Buyer',
      propertyAddress: property?.address || 'Property',
      daysInStage: transaction.stage_history?.length > 0 
        ? Math.floor((new Date() - new Date(transaction.stage_history[transaction.stage_history.length - 1].entered_date)) / (1000 * 60 * 60 * 24))
        : 0,
      lastInteraction: interactions[0] ? {
        type: interactions[0].interaction_type,
        date: interactions[0].interaction_date,
        subject: interactions[0].subject
      } : null,
      messageType: messageType, // 'follow_up', 'check_in', 'next_steps', 'objection_handling'
      agentName: user.full_name
    };

    // Generate personalized message
    const message = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a personalized ${messageType.replace(/_/g, ' ')} message for a real estate deal follow-up.

Context:
${JSON.stringify(outreachContext, null, 2)}

Requirements:
- Professional yet friendly tone
- Keep it concise (2-3 paragraphs max)
- Personalize with buyer's first name
- Reference the property address
- Be appropriate for the current deal stage
- Include a clear call-to-action
- For "follow_up": Check in on deal progress
- For "check_in": Show genuine interest and care
- For "next_steps": Guide to next actions
- For "objection_handling": Address concerns professionally

Generate response in JSON format:
{
  "subject": "string (email subject line)",
  "message": "string (message body)",
  "tone": "string (professional/friendly/urgent)"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          message: { type: "string" },
          tone: { type: "string" }
        }
      }
    });

    return Response.json(message);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});