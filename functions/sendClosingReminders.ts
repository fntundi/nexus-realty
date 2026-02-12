import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all transactions with closing dates approaching
    const transactions = await base44.asServiceRole.entities.Transaction.list();
    const now = new Date();
    const upcoming = [];

    transactions?.forEach(txn => {
      if (!txn.closing_date || txn.status !== 'active') return;

      const closingDate = new Date(txn.closing_date);
      const daysUntilClosing = Math.ceil((closingDate - now) / (1000 * 60 * 60 * 24));

      // Send reminder 7 days before and 1 day before closing
      if (daysUntilClosing === 7 || daysUntilClosing === 1) {
        upcoming.push({ ...txn, daysUntilClosing });
      }
    });

    // Get agents and properties
    const agents = await base44.asServiceRole.entities.Agent.list();
    const properties = await base44.asServiceRole.entities.Property.list();

    // Send reminders to all involved parties
    for (const txn of upcoming) {
      const agent = agents?.find(a => a.id === txn.agent_id);
      const property = properties?.find(p => p.id === txn.property_id);
      const recipients = [txn.buyer_email];
      if (txn.lender_email) recipients.push(txn.lender_email);

      const closingDate = new Date(txn.closing_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const subject = txn.daysUntilClosing === 1
        ? `⏰ Closing Tomorrow: ${property?.address || 'Your Transaction'}`
        : `📅 Closing in ${txn.daysUntilClosing} Days`;

      const body = `Hello,

${txn.daysUntilClosing === 1 
  ? `Your closing is happening TOMORROW!` 
  : `Your closing is scheduled in ${txn.daysUntilClosing} days.`}

Property: ${property?.address || 'TBD'}
Closing Date: ${closingDate}
Contract Price: $${txn.contract_price?.toLocaleString() || 'TBD'}

Please ensure all required documents are submitted and review final details in your client portal.

Your Agent: ${agent?.user_email || 'Your Real Estate Agent'}

If you have any questions, please log in to your client portal or contact your agent directly.`;

      for (const recipientEmail of recipients) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: recipientEmail,
            subject: subject,
            body: body,
            from_name: agent?.user_email || 'Real Estate Agent'
          });
        } catch (error) {
          console.error(`Failed to send closing reminder to ${recipientEmail}:`, error);
        }
      }
    }

    return Response.json({
      success: true,
      reminders_sent: upcoming.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in sendClosingReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});