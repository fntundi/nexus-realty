import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_type, filters = {} } = await req.json();

    if (!report_type) {
      return Response.json({ error: 'Missing report_type' }, { status: 400 });
    }

    // Fetch base data
    const transactions = await base44.entities.Transaction.list();
    const agents = await base44.entities.Agent.list();
    const properties = await base44.entities.Property.list();
    const markets = await base44.entities.Market.list();

    // Apply filters
    let filteredTransactions = transactions;
    if (filters.market_id) {
      filteredTransactions = filteredTransactions.filter(t => t.market_id === filters.market_id);
    }
    if (filters.agent_id) {
      filteredTransactions = filteredTransactions.filter(t => t.agent_id === filters.agent_id);
    }
    if (filters.stage) {
      filteredTransactions = filteredTransactions.filter(t => t.current_stage === filters.stage);
    }
    if (filters.status) {
      filteredTransactions = filteredTransactions.filter(t => t.status === filters.status);
    }
    if (filters.date_from) {
      filteredTransactions = filteredTransactions.filter(t => 
        new Date(t.created_date) >= new Date(filters.date_from)
      );
    }
    if (filters.date_to) {
      filteredTransactions = filteredTransactions.filter(t => 
        new Date(t.created_date) <= new Date(filters.date_to)
      );
    }

    const getAgentName = (agentId) => {
      const agent = agents.find(a => a.id === agentId);
      return agent?.user_email || 'Unknown';
    };

    const getPropertyAddress = (propertyId) => {
      const property = properties.find(p => p.id === propertyId);
      return property?.address || 'N/A';
    };

    const getMarketName = (marketId) => {
      const market = markets.find(m => m.id === marketId);
      return market?.name || 'Unknown';
    };

    if (report_type === 'transaction_status') {
      const data = filteredTransactions.map(t => ({
        id: t.id,
        property: getPropertyAddress(t.property_id),
        agent: getAgentName(t.agent_id),
        buyer: t.buyer_email,
        stage: t.current_stage,
        status: t.status,
        contract_price: t.contract_price || 0,
        created_date: t.created_date,
        closing_date: t.closing_date
      }));

      return Response.json({
        report_type,
        data,
        summary: {
          total: data.length,
          by_stage: Object.entries(
            data.reduce((acc, t) => {
              acc[t.stage] = (acc[t.stage] || 0) + 1;
              return acc;
            }, {})
          ).map(([stage, count]) => ({ stage, count })),
          total_value: data.reduce((sum, t) => sum + (t.contract_price || 0), 0)
        }
      });
    }

    if (report_type === 'agent_performance') {
      const agentStats = agents.map(agent => {
        const agentTransactions = filteredTransactions.filter(t => t.agent_id === agent.id);
        const closedDeals = agentTransactions.filter(t => t.status === 'closed_won');
        const activeDeals = agentTransactions.filter(t => t.status === 'active');
        
        const totalValue = closedDeals.reduce((sum, t) => sum + (t.contract_price || 0), 0);
        const avgDaysToClose = closedDeals.length > 0
          ? closedDeals.reduce((sum, deal) => {
              if (deal.closing_date) {
                const days = Math.floor((new Date(deal.closing_date) - new Date(deal.created_date)) / (1000 * 60 * 60 * 24));
                return sum + days;
              }
              return sum;
            }, 0) / closedDeals.length
          : 0;

        return {
          agent_email: agent.user_email,
          active_deals: activeDeals.length,
          closed_deals: closedDeals.length,
          total_value: totalValue,
          success_rate: agent.success_rate || 0,
          avg_days_to_close: Math.round(avgDaysToClose),
          current_workload: agent.current_workload || 0
        };
      });

      return Response.json({
        report_type,
        data: agentStats.sort((a, b) => b.total_value - a.total_value),
        summary: {
          total_agents: agentStats.length,
          total_active_deals: agentStats.reduce((sum, a) => sum + a.active_deals, 0),
          total_closed_deals: agentStats.reduce((sum, a) => sum + a.closed_deals, 0),
          total_pipeline_value: agentStats.reduce((sum, a) => sum + a.total_value, 0)
        }
      });
    }

    if (report_type === 'pipeline_value') {
      const pipelineData = filteredTransactions
        .filter(t => t.status === 'active' && t.contract_price)
        .map(t => ({
          id: t.id,
          property: getPropertyAddress(t.property_id),
          agent: getAgentName(t.agent_id),
          market: getMarketName(t.market_id),
          stage: t.current_stage,
          value: t.contract_price,
          probability: getProbabilityByStage(t.current_stage),
          weighted_value: t.contract_price * getProbabilityByStage(t.current_stage),
          expected_close: t.closing_date
        }));

      const byStage = Object.entries(
        pipelineData.reduce((acc, t) => {
          if (!acc[t.stage]) {
            acc[t.stage] = { count: 0, value: 0, weighted_value: 0 };
          }
          acc[t.stage].count++;
          acc[t.stage].value += t.value;
          acc[t.stage].weighted_value += t.weighted_value;
          return acc;
        }, {})
      ).map(([stage, stats]) => ({ stage, ...stats }));

      return Response.json({
        report_type,
        data: pipelineData.sort((a, b) => b.value - a.value),
        summary: {
          total_deals: pipelineData.length,
          total_value: pipelineData.reduce((sum, t) => sum + t.value, 0),
          weighted_value: pipelineData.reduce((sum, t) => sum + t.weighted_value, 0),
          by_stage: byStage
        }
      });
    }

    if (report_type === 'forecast') {
      const now = new Date();
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const next60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const closingSoon = filteredTransactions.filter(t => {
        if (!t.closing_date || t.status !== 'active') return false;
        const closeDate = new Date(t.closing_date);
        return closeDate >= now && closeDate <= next90Days;
      });

      const forecast30 = closingSoon.filter(t => new Date(t.closing_date) <= next30Days);
      const forecast60 = closingSoon.filter(t => new Date(t.closing_date) <= next60Days);
      const forecast90 = closingSoon.filter(t => new Date(t.closing_date) <= next90Days);

      return Response.json({
        report_type,
        data: closingSoon.map(t => ({
          property: getPropertyAddress(t.property_id),
          agent: getAgentName(t.agent_id),
          stage: t.current_stage,
          value: t.contract_price || 0,
          closing_date: t.closing_date,
          probability: getProbabilityByStage(t.current_stage)
        })),
        summary: {
          next_30_days: {
            count: forecast30.length,
            value: forecast30.reduce((sum, t) => sum + (t.contract_price || 0), 0)
          },
          next_60_days: {
            count: forecast60.length,
            value: forecast60.reduce((sum, t) => sum + (t.contract_price || 0), 0)
          },
          next_90_days: {
            count: forecast90.length,
            value: forecast90.reduce((sum, t) => sum + (t.contract_price || 0), 0)
          }
        }
      });
    }

    return Response.json({ error: 'Invalid report_type' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});

function getProbabilityByStage(stage) {
  const probabilities = {
    pre_qual: 0.2,
    showing: 0.3,
    offer: 0.5,
    under_contract: 0.75,
    closing: 0.9
  };
  return probabilities[stage] || 0.5;
}