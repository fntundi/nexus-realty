import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active transactions that have status changes in the last 24 hours
    const transactions = await base44.asServiceRole.entities.Transaction.list();
    const oneDay = 24 * 60 * 60 * 1000;
    const now = new Date();

    const recentUpdates = transactions
      ?.filter(txn => {
        const lastUpdate = new Date(txn.updated_date || txn.created_date);
        return now - lastUpdate < oneDay && txn.status === 'active';
      })
      .slice(0, 50) || [];

    // Get agents and properties for context
    const agents = await base44.asServiceRole.entities.Agent.list();
    const properties = await base44.asServiceRole.entities.Property.list();
    const messages = await base44.asServiceRole.entities.Message.list();

    // Send status update emails to involved clients
    for (const txn of recentUpdates) {
      const agent = agents?.find(a => a.id === txn.agent_id);
      const property = properties?.find(p => p.id === txn.property_id);
      const recipients = [txn.buyer_email];
      if (txn.lender_email) recipients.push(txn.lender_email);

      // Get recent messages for this transaction
      const txnMessages = messages?.filter(m => m.transaction_id === txn.id) || [];
      const latestMessage = txnMessages[txnMessages.length - 1];

      for (const recipientEmail of recipients) {
        const subject = `Deal Update: ${property?.address || 'Your Transaction'}`;
        const stageLabel = txn.current_stage.replace(/_/g, ' ');
        
        const body = `Hello,

Your transaction for ${property?.address || 'the property'} has been updated.

Current Status: ${stageLabel}
Expected Closing: ${txn.closing_date || 'TBD'}
${txn.contract_price ? `Contract Price: $${txn.contract_price.toLocaleString()}` : ''}

${latestMessage ? `Latest Update: ${latestMessage.content.substring(0, 200)}...` : ''}

Please log in to your client portal to view full details and communicate with your agent.

Best regards,
Your Real Estate Agent`;

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: recipientEmail,
            subject: subject,
            body: body,
            from_name: agent?.user_email || 'Real Estate Agent'
          });
        } catch (error) {
          console.error(`Failed to send email to ${recipientEmail}:`, error);
        }
      }
    }

    return Response.json({
      success: true,
      updates_sent: recentUpdates.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in sendClientStatusUpdates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});