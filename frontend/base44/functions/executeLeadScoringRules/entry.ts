import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active rules
    const rules = await base44.asServiceRole.entities.LeadScoringRule.filter({
      is_active: true
    });

    // Get all contacts with high scores
    const contacts = await base44.asServiceRole.entities.Contact.list();
    const highScoringContacts = contacts.filter(c => c.lead_score >= 50);

    const executedRules = [];

    for (const rule of rules) {
      // Find contacts that match this rule's threshold
      const matchingContacts = highScoringContacts.filter(c => c.lead_score >= rule.score_threshold);

      for (const contact of matchingContacts) {
        try {
          if (rule.action_type === 'reassign_lead') {
            // Reassign related leads to new agent — look up Agent ID from email
            const leads = await base44.asServiceRole.entities.Lead.filter({
              buyer_email: contact.email
            });
            const targetAgents = rule.reassign_to_agent_email
              ? await base44.asServiceRole.entities.Agent.filter({ user_email: rule.reassign_to_agent_email })
              : [];
            const targetAgentId = targetAgents[0]?.id || null;

            for (const lead of leads) {
              await base44.asServiceRole.entities.Lead.update(lead.id, {
                assigned_agent_id: targetAgentId,
                status: 'assigned',
                assigned_date: new Date().toISOString()
              });
            }

            executedRules.push({
              rule_id: rule.id,
              contact_id: contact.id,
              action: 'reassigned_leads',
              leads_count: leads.length
            });
          }

          if (rule.action_type === 'create_task') {
            // Create task for agent
            const leads = await base44.asServiceRole.entities.Lead.filter({
              buyer_email: contact.email
            });

            if (leads.length > 0) {
              const lead = leads[0];
              const transactions = await base44.asServiceRole.entities.Transaction.filter({
                lead_id: lead.id
              });

              if (transactions.length > 0) {
                const txn = transactions[0];
                await base44.asServiceRole.entities.TransactionTask.create({
                  transaction_id: txn.id,
                  title: rule.task_title,
                  description: rule.task_description,
                  stage: txn.current_stage,
                  priority: rule.task_priority,
                  assigned_to_user: rule.reassign_to_agent_email || lead.assigned_agent_id
                });

                executedRules.push({
                  rule_id: rule.id,
                  contact_id: contact.id,
                  action: 'created_task',
                  transaction_id: txn.id
                });
              }
            }
          }

          if (rule.action_type === 'send_notification') {
            // Create notification for agent
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: rule.notify_agent_email,
              notification_type: 'system',
              title: `High-Scoring Lead: ${contact.first_name} ${contact.last_name}`,
              message: rule.notification_message || `Lead score reached ${contact.lead_score}`,
              related_entity_type: 'lead',
              priority: 'high'
            });

            executedRules.push({
              rule_id: rule.id,
              contact_id: contact.id,
              action: 'sent_notification'
            });
          }

          // Update rule execution count
          await base44.asServiceRole.entities.LeadScoringRule.update(rule.id, {
            execution_count: (rule.execution_count || 0) + 1,
            last_execution: new Date().toISOString()
          });
        } catch (actionError) {
          console.error(`Error executing rule ${rule.id} for contact ${contact.id}:`, actionError);
        }
      }
    }

    return Response.json({
      status: 'success',
      message: `Executed ${executedRules.length} rule actions`,
      executedRules
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});