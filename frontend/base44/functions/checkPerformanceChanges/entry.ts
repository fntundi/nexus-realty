import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all performance change alerts that are enabled
    const alerts = await base44.asServiceRole.entities.AlertConfig.filter({
      alert_type: 'performance_changes',
      enabled: true
    });

    if (!alerts || alerts.length === 0) {
      return Response.json({ processed: 0 });
    }

    let processed = 0;

    for (const alert of alerts) {
      const percentageThreshold = alert.threshold_value; // e.g., 15%

      // Get all agents to check performance
      let agents = await base44.asServiceRole.entities.Agent.list();
      
      // Apply agent filters if specified
      if (alert.agent_filters && alert.agent_filters.length > 0) {
        agents = agents.filter(a => alert.agent_filters.includes(a.id));
      }

      // Apply market filters if specified
      if (alert.market_filters && alert.market_filters.length > 0) {
        agents = agents.filter(a => alert.market_filters.includes(a.market_id));
      }

      const significantChanges = [];

      for (const agent of agents) {
        // Get previous month's performance (stored in monthly_performance)
        if (!agent.monthly_performance || agent.monthly_performance.length < 2) continue;

        const currentMonth = agent.monthly_performance[agent.monthly_performance.length - 1];
        const previousMonth = agent.monthly_performance[agent.monthly_performance.length - 2];

        if (!currentMonth || !previousMonth) continue;

        const currentRate = currentMonth.conversion_rate || 0;
        const previousRate = previousMonth.conversion_rate || 0;

        if (previousRate === 0) continue;

        const changePercent = Math.abs(((currentRate - previousRate) / previousRate) * 100);

        if (changePercent >= percentageThreshold) {
          const changeDirection = currentRate > previousRate ? 'increased' : 'decreased';
          significantChanges.push({
            agent,
            changePercent: changePercent.toFixed(1),
            changeDirection,
            previousRate: (previousRate * 100).toFixed(1),
            currentRate: (currentRate * 100).toFixed(1),
            month: currentMonth.month
          });
        }
      }

      if (significantChanges.length > 0) {
        const recipients = [alert.user_email, ...(alert.recipient_emails || [])];
        const subject = `📊 Significant Performance Changes Detected`;

        const body = `
The following agents have shown significant performance changes:

${significantChanges.map(c => `
- Agent: ${c.agent.user_email}
- Change: ${c.changeDirection} by ${c.changePercent}%
- Previous Conversion Rate: ${c.previousRate}%
- Current Conversion Rate: ${c.currentRate}%
- Month: ${c.month}
`).join('\n')}

Review these changes and provide coaching or support as needed.
`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipients.join(', '),
          subject,
          body
        });

        await base44.asServiceRole.entities.AlertConfig.update(alert.id, {
          last_alert_sent: new Date().toISOString()
        });

        processed++;
      }
    }

    return Response.json({ processed });
  } catch (error) {
    console.error('Error checking performance changes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});