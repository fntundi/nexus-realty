import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await req.json();

    // Fetch transaction data
    const transaction = await base44.asServiceRole.entities.Transaction.get(transactionId);
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Fetch related data for context
    const lead = await base44.asServiceRole.entities.Lead.get(transaction.lead_id).catch(() => null);
    const property = await base44.asServiceRole.entities.Property.get(transaction.property_id).catch(() => null);
    const interactions = await base44.asServiceRole.entities.Interaction.filter({ 
      related_transaction_id: transactionId 
    }).catch(() => []);

    // Build context for AI analysis
    const dealContext = {
      stage: transaction.current_stage,
      status: transaction.status,
      contractPrice: transaction.contract_price,
      offerAmount: transaction.offer_amount,
      closingDate: transaction.closing_date,
      daysInStage: transaction.stage_history?.length > 0 
        ? Math.floor((new Date() - new Date(transaction.stage_history[transaction.stage_history.length - 1].entered_date)) / (1000 * 60 * 60 * 24))
        : 0,
      buyerEmail: transaction.buyer_email,
      propertyDetails: property ? {
        address: property.address,
        price: property.list_price,
        type: property.property_type,
        squareFeet: property.square_feet
      } : null,
      leadInfo: lead ? {
        leadScore: lead.lead_score,
        contactType: lead.contact_type,
        status: lead.status
      } : null,
      recentInteractions: interactions.slice(0, 5).map(i => ({
        type: i.interaction_type,
        date: i.interaction_date,
        outcome: i.outcome
      }))
    };

    // Get AI analysis
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this real estate deal and provide:
1. Deal Category (Hot Prospect, Warm Lead, Cold Lead, High-Value, etc.)
2. Closing Probability (0-100%)
3. Risk Factors (if any)
4. Recommended Next Actions (top 3 actions)
5. Key Timeline Insights

Deal Context:
${JSON.stringify(dealContext, null, 2)}

Provide response in JSON format with these exact fields:
{
  "category": "string",
  "closingProbability": "number 0-100",
  "riskFactors": ["string"],
  "nextActions": ["string"],
  "timelineInsights": "string",
  "reasoning": "string"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          category: { type: "string" },
          closingProbability: { type: "number" },
          riskFactors: { type: "array", items: { type: "string" } },
          nextActions: { type: "array", items: { type: "string" } },
          timelineInsights: { type: "string" },
          reasoning: { type: "string" }
        }
      }
    });

    return Response.json(analysis);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});