import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all high-value deal alerts that are enabled
    const alerts = await base44.asServiceRole.entities.AlertConfig.filter({
      alert_type: 'high_value_deals',
      enabled: true
    });

    if (!alerts || alerts.length === 0) {
      return Response.json({ processed: 0 });
    }

    let processed = 0;

    for (const alert of alerts) {
      // Get recent transactions above threshold
      const transactions = await base44.asServiceRole.entities.Transaction.filter({
        contract_price: { $gte: alert.threshold_value }
      });

      // Filter for transactions created after last alert
      const recentTransactions = transactions.filter(t => {
        if (!alert.last_alert_sent) return true;
        return new Date(t.created_date) > new Date(alert.last_alert_sent);
      });

      // Apply market filters if specified
      let filteredTxns = recentTransactions;
      if (alert.market_filters && alert.market_filters.length > 0) {
        filteredTxns = recentTransactions.filter(t => alert.market_filters.includes(t.market_id));
      }

      // Apply agent filters if specified
      if (alert.agent_filters && alert.agent_filters.length > 0) {
        filteredTxns = filteredTxns.filter(t => alert.agent_filters.includes(t.agent_id));
      }

      if (filteredTxns.length > 0) {
        const recipients = [alert.user_email, ...(alert.recipient_emails || [])];
        const subject = `🎉 ${filteredTxns.length} High-Value Deal(s) in Pipeline`;
        
        const body = `
High-value deals have entered your pipeline:

${filteredTxns.map(t => `
- Contract Value: $${t.contract_price?.toLocaleString() || 'N/A'}
- Stage: ${t.current_stage?.replace(/_/g, ' ') || 'Unknown'}
- Buyer: ${t.buyer_email}
`).join('\n')}

Threshold: $${alert.threshold_value?.toLocaleString()}
`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipients.join(', '),
          subject,
          body
        });

        // Update last alert sent
        await base44.asServiceRole.entities.AlertConfig.update(alert.id, {
          last_alert_sent: new Date().toISOString()
        });

        processed++;
      }
    }

    return Response.json({ processed });
  } catch (error) {
    console.error('Error checking high-value deals:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});