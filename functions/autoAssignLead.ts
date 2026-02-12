import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id } = await req.json();

    if (!lead_id) {
      return Response.json({ error: 'lead_id is required' }, { status: 400 });
    }

    // Get the lead
    const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id });
    const lead = leads[0];

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get market configuration
    const markets = await base44.asServiceRole.entities.Market.filter({ id: lead.market_id });
    const market = markets[0];

    if (!market) {
      return Response.json({ error: 'Market not found' }, { status: 404 });
    }

    // Get all active agents in the market
    const agents = await base44.asServiceRole.entities.Agent.filter({
      market_id: lead.market_id,
      status: 'active'
    });

    if (agents.length === 0) {
      return Response.json({ error: 'No active agents available in this market' }, { status: 400 });
    }

    // Get property if available for better matching
    let property = null;
    if (lead.property_id) {
      const properties = await base44.asServiceRole.entities.Property.filter({ id: lead.property_id });
      property = properties[0];
    }

    // Score each agent
    const assignmentRules = market.assignment_rules || {
      territory_weight: 0.4,
      workload_weight: 0.3,
      rotation_weight: 0.2,
      success_rate_weight: 0.1
    };

    const scoredAgents = agents.map(agent => {
      let score = 0;

      // 1. Territory Match Score (0-1) - Enhanced with granular matching
      let territoryScore = 0;
      
      // Check new territory_definitions first
      if (agent.territory_definitions && agent.territory_definitions.length > 0) {
        if (lead.preferred_areas && lead.preferred_areas.length > 0) {
          // Try to match against detailed territories
          const matches = agent.territory_definitions.filter(td => {
            return lead.preferred_areas.some(pa => {
              const paLower = pa.toLowerCase();
              const nameLower = td.name.toLowerCase();
              const valueLower = td.value.toLowerCase();
              
              // Direct match on name or value
              if (nameLower.includes(paLower) || valueLower.includes(paLower) ||
                  paLower.includes(nameLower) || paLower.includes(valueLower)) {
                return true;
              }
              
              // For zip codes, exact match
              if (td.type === 'zip_code' && td.value === pa) {
                return true;
              }
              
              return false;
            });
          });
          
          if (matches.length > 0) {
            // Perfect match - highly specific territory alignment
            territoryScore = 1.0;
          } else {
            // Has territories but no match
            territoryScore = 0.2;
          }
        } else {
          // Agent has territories, lead doesn't specify - medium score
          territoryScore = 0.5;
        }
      } else if (agent.territories && agent.territories.length > 0 && lead.preferred_areas) {
        // Legacy territory matching (backwards compatibility)
        const matchingTerritories = agent.territories.filter(t => 
          lead.preferred_areas.some(pa => pa.includes(t) || t.includes(pa))
        );
        territoryScore = matchingTerritories.length > 0 ? 1 : 0.3;
      } else if (agent.territories && agent.territories.length > 0) {
        territoryScore = 0.5; // Agent has territories but lead doesn't specify
      } else {
        territoryScore = 0.8; // Agent covers all territories
      }

      // 2. Workload Score (0-1) - Higher score = more capacity
      const workloadRatio = (agent.current_workload || 0) / (agent.max_workload || 10);
      const complexityRatio = (agent.complexity_score || 0) / (agent.max_complexity_score || 100);
      const workloadScore = 1 - Math.max(workloadRatio, complexityRatio);

      // 3. Rotation Score (0-1) - Favor agents with fewer total assignments
      const maxAssignments = Math.max(...agents.map(a => a.total_assignments || 0), 1);
      const rotationScore = 1 - ((agent.total_assignments || 0) / maxAssignments);

      // 4. Success Rate Score (0-1) - Based on property type and price
      let successScore = (agent.success_rate || 0) / 100;
      
      if (property) {
        // Check property type specific success rate
        const propertyTypeStats = agent.property_type_stats?.[property.property_type];
        if (propertyTypeStats && propertyTypeStats.total > 2) {
          successScore = (propertyTypeStats.success_rate || 0) / 100;
        }

        // Check price range specific success rate
        let priceRangeKey = 'under_300k';
        if (property.price >= 1000000) priceRangeKey = 'over_1m';
        else if (property.price >= 500000) priceRangeKey = '500k_1m';
        else if (property.price >= 300000) priceRangeKey = '300k_500k';

        const priceRangeStats = agent.price_range_stats?.[priceRangeKey];
        if (priceRangeStats && priceRangeStats.total > 2) {
          // Average property type and price range success rates
          successScore = (successScore + (priceRangeStats.success_rate || 0) / 100) / 2;
        }
      }

      // Calculate weighted score
      score = (
        territoryScore * assignmentRules.territory_weight +
        workloadScore * assignmentRules.workload_weight +
        rotationScore * assignmentRules.rotation_weight +
        successScore * assignmentRules.success_rate_weight
      );

      return {
        agent,
        score,
        breakdown: {
          territoryScore,
          workloadScore,
          rotationScore,
          successScore,
          finalScore: score
        }
      };
    });

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);

    // Select the best agent
    const bestMatch = scoredAgents[0];

    // Update lead
    await base44.asServiceRole.entities.Lead.update(lead_id, {
      assigned_agent_id: bestMatch.agent.id,
      status: 'assigned',
      assigned_date: new Date().toISOString(),
      assignment_method: 'auto'
    });

    // Update agent workload
    await base44.asServiceRole.entities.Agent.update(bestMatch.agent.id, {
      current_workload: (bestMatch.agent.current_workload || 0) + 1,
      total_assignments: (bestMatch.agent.total_assignments || 0) + 1
    });

    return Response.json({
      success: true,
      assigned_agent: {
        id: bestMatch.agent.id,
        email: bestMatch.agent.user_email
      },
      assignment_breakdown: bestMatch.breakdown,
      all_scores: scoredAgents.map(sa => ({
        agent_email: sa.agent.user_email,
        score: sa.score,
        breakdown: sa.breakdown
      }))
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});