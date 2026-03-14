import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { lead_id } = payload;

    if (!lead_id) {
      return Response.json({ error: 'lead_id required' }, { status: 400 });
    }

    // Fetch the lead
    const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id });
    const lead = leads?.[0];
    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Fetch agents in the same market
    const agents = await base44.asServiceRole.entities.Agent.filter({ market_id: lead.market_id });
    const assignmentRules = await base44.asServiceRole.entities.AssignmentRule.filter({ market_id: lead.market_id });

    if (!agents || agents.length === 0) {
      return Response.json({ error: 'No agents available in this market' }, { status: 400 });
    }

    // Scoring system for agent assignment
    let bestAgent = null;
    let bestScore = -1;

    for (const agent of agents) {
      if (agent.status !== 'active' || agent.current_workload >= agent.max_workload) continue;

      let score = 100; // Base score

      // 1. Territory matching (0-25 points)
      const territoryScore = evaluateTerritoryMatch(agent, lead, assignmentRules);
      score += territoryScore;

      // 2. Workload balance (0-20 points)
      const workloadScore = (agent.max_workload - agent.current_workload) / agent.max_workload * 20;
      score += workloadScore;

      // 3. Complexity score (0-15 points)
      const complexityScore = (agent.max_complexity_score - agent.complexity_score) / agent.max_complexity_score * 15;
      score += complexityScore;

      // 4. Success rate for property type (0-20 points)
      const successScore = getPropertyTypeSuccessScore(agent, lead, assignmentRules);
      score += successScore;

      // 5. Rotation balance (0-10 points)
      const rotationScore = (1 / (agent.total_assignments + 1)) * 10;
      score += rotationScore;

      // 6. Lead source performance (0-10 points)
      const sourceScore = getLeadSourceScore(agent, lead);
      score += sourceScore;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    if (!bestAgent) {
      return Response.json({ error: 'No suitable agent found for assignment' }, { status: 400 });
    }

    // Assign lead to agent with transaction-like behavior
    let updatedLead;
    let notification;
    
    try {
      updatedLead = await base44.asServiceRole.entities.Lead.update(lead.id, {
        status: 'assigned',
        assigned_agent_id: bestAgent.id,
        assigned_date: new Date().toISOString(),
        assignment_method: 'auto'
      });

      // Update agent workload
      await base44.asServiceRole.entities.Agent.update(bestAgent.id, {
        current_workload: (bestAgent.current_workload || 0) + 1,
        total_assignments: (bestAgent.total_assignments || 0) + 1
      });

      // Create notification for agent
      notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: bestAgent.user_email,
      notification_type: 'lead_assigned',
      title: 'New Lead Assigned',
      message: `${lead.buyer_name} (${lead.source}) - Budget: $${lead.budget_max?.toLocaleString() || 'TBD'}`,
      related_entity_type: 'lead',
      related_entity_id: lead.id,
      action_url: `/lead-pool?lead_id=${lead.id}`,
      priority: 'high',
      metadata: {
        buyer_name: lead.buyer_name,
        source: lead.source,
        budget: lead.budget_max,
        market: lead.market_id
      }
    });
    } catch (error) {
      // Compensating transaction - rollback lead assignment if notification fails
      if (updatedLead) {
        await base44.asServiceRole.entities.Lead.update(lead.id, {
          status: 'unassigned',
          assigned_agent_id: null,
          assigned_date: null
        });
        await base44.asServiceRole.entities.Agent.update(bestAgent.id, {
          current_workload: Math.max(0, (bestAgent.current_workload || 0) - 1)
        });
      }
      throw error;
    }

    return Response.json({
      success: true,
      assigned_agent: bestAgent.user_email,
      assignment_score: bestScore,
      lead_id: lead.id
    });
  } catch (error) {
    console.error('Error in autoAssignLead:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function evaluateTerritoryMatch(agent, lead, rules) {
  if (!agent.territory_definitions || agent.territory_definitions.length === 0) {
    return 0;
  }

  const rule = rules?.find(r => r.agent_id === agent.id);
  if (!rule || !rule.territory_match_weight) return 10;

  // Check if lead's preferred areas match agent's territories
  if (lead.preferred_areas && lead.preferred_areas.length > 0) {
    const agentTerritories = agent.territory_definitions.map(t => t.value.toLowerCase());
    const matchCount = lead.preferred_areas.filter(area =>
      agentTerritories.some(territory => territory.includes(area.toLowerCase()))
    ).length;

    return (matchCount / lead.preferred_areas.length) * 25;
  }

  return 15;
}

function getPropertyTypeSuccessScore(agent, lead, rules) {
  const rule = rules?.find(r => r.agent_id === agent.id);
  if (!rule) return 10;

  // If lead has preferred property types, check agent's performance
  if (rule.preferred_property_types && rule.preferred_property_types.length > 0) {
    return 15;
  }

  return 10;
}

function getLeadSourceScore(agent, lead) {
  const sourceStats = agent?.lead_source_stats || {};
  const sourceKey = lead.source.replace(/[_-]/g, '_');
  const stats = sourceStats[sourceKey];

  if (stats && stats.success_rate > 0) {
    return Math.min((stats.success_rate / 100) * 10, 10);
  }

  return 5;
}