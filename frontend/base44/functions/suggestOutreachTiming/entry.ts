import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId, contactEmail } = await req.json();

    // Fetch interaction history
    const interactions = await base44.asServiceRole.entities.Interaction.filter({
      related_lead_id: leadId
    }, '-interaction_date').catch(() => []);

    // Analyze interaction patterns
    const interactionTimes = interactions.map(i => {
      const date = new Date(i.interaction_date);
      return {
        hour: date.getHours(),
        dayOfWeek: date.getDay(),
        type: i.interaction_type,
        outcome: i.outcome
      };
    });

    // Get AI recommendation
    const timing = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze the contact's interaction history and recommend the optimal time for outreach.

Interaction History:
${JSON.stringify(interactionTimes, null, 2)}

Contact Email: ${contactEmail}

Based on the interaction patterns, provide recommendations for:
1. Best days of the week to reach out
2. Best hours of the day
3. Frequency recommendation (how often to contact)
4. Reasoning for recommendations

Respond in JSON format:
{
  "bestDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "bestHours": [9, 10, 11, 14, 15],
  "frequency": "string (e.g., 'every 3 days', 'weekly')",
  "timezone": "string (e.g., 'EST', 'PST')",
  "reasoning": "string",
  "nextSuggestedTime": "string (ISO datetime)"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          bestDays: { type: "array", items: { type: "string" } },
          bestHours: { type: "array", items: { type: "number" } },
          frequency: { type: "string" },
          timezone: { type: "string" },
          reasoning: { type: "string" },
          nextSuggestedTime: { type: "string" }
        }
      }
    });

    return Response.json(timing);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});