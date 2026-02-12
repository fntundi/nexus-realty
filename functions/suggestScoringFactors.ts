import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { industry, business_goals, existing_factors } = await req.json();

    const prompt = `You are a real estate lead scoring expert. Based on the following context, suggest 5-7 highly relevant scoring factors.

Industry: ${industry || 'Real Estate'}
Business Goals: ${business_goals || 'Increase lead conversion and close rate'}
Existing Factors: ${existing_factors?.map(f => f.factor_name).join(', ') || 'None'}

For each factor, provide:
1. Factor Name (specific and measurable)
2. Factor Type (behavioral, demographic, engagement, interaction, or custom)
3. Suggested Field Name (what to track)
4. Recommended Weight (1-10, where higher = more important)
5. Suggested Points (10-50, points awarded if condition met)
6. Example Condition (e.g., "greater_than: 5", "contains: luxury")
7. Business Rationale (why this matters for conversion)

Return as JSON array with these exact fields: factor_name, factor_type, field_name, weight, points, condition_example, rationale`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          factors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                factor_name: { type: 'string' },
                factor_type: { type: 'string' },
                field_name: { type: 'string' },
                weight: { type: 'number' },
                points: { type: 'number' },
                condition_example: { type: 'string' },
                rationale: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      suggested_factors: response.factors || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});