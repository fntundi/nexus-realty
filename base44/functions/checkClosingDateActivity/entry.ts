import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all closing date alerts that are enabled
    const alerts = await base44.asServiceRole.entities.AlertConfig.filter({
      alert_type: 'closing_date_activity',
      enabled: true
    });

    if (!alerts || alerts.length === 0) {
      return Response.json({ processed: 0 });
    }

    let processed = 0;
    const now = new Date();

    for (const alert of alerts) {
      const daysUntilClose = alert.threshold_value; // e.g., 7 days

      // Get active transactions nearing closing
      const transactions = await base44.asServiceRole.entities.Transaction.filter({
        status: 'active',
        current_stage: { $in: ['under_contract', 'closing'] }
      });

      // Filter for deals nearing close date
      const nearingClose = transactions.filter(t => {
        if (!t.closing_date) return false;
        const closingDate = new Date(t.closing_date);
        const daysRemaining = Math.ceil((closingDate - now) / (1000 * 60 * 60 * 24));
        return daysRemaining > 0 && daysRemaining <= daysUntilClose;
      });

      // Get recent messages to check activity
      const dealsWithoutActivity = [];
      for (const deal of nearingClose) {
        const messages = await base44.asServiceRole.entities.Message.filter({
          transaction_id: deal.id
        });

        const lastMessage = messages?.[0];
        const lastMessageDate = lastMessage ? new Date(lastMessage.created_date) : new Date(deal.created_date);
        const daysSinceActivity = Math.floor((now - lastMessageDate) / (1000 * 60 * 60 * 24));

        // Alert if 3+ days of no activity and closing is approaching
        if (daysSinceActivity >= 3) {
          dealsWithoutActivity.push({
            ...deal,
            daysSinceActivity,
            daysUntilClosing: Math.ceil((new Date(deal.closing_date) - now) / (1000 * 60 * 60 * 24))
          });
        }
      }

      // Apply market filters
      let filtered = dealsWithoutActivity;
      if (alert.market_filters && alert.market_filters.length > 0) {
        filtered = dealsWithoutActivity.filter(t => alert.market_filters.includes(t.market_id));
      }

      if (alert.agent_filters && alert.agent_filters.length > 0) {
        filtered = filtered.filter(t => alert.agent_filters.includes(t.agent_id));
      }

      if (filtered.length > 0) {
        const recipients = [alert.user_email, ...(alert.recipient_emails || [])];
        const subject = `⚠️ ${filtered.length} Deal(s) Nearing Close with No Recent Activity`;

        const body = `
The following deals are approaching their closing date with no recent activity:

${filtered.map(d => `
- Property: ${d.property_id}
- Closing Date: ${new Date(d.closing_date).toLocaleDateString()}
- Days Until Close: ${d.daysUntilClosing}
- Days Since Last Activity: ${d.daysSinceActivity}
- Buyer: ${d.buyer_email}
`).join('\n')}

Review and follow up with buyers to ensure smooth closing.
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
    console.error('Error checking closing date activity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});