import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all enabled reminder configs
    const configs = await base44.asServiceRole.entities.ReminderConfig.filter({
      enabled: true
    });

    if (!configs || configs.length === 0) {
      return Response.json({ processed: 0 });
    }

    let processed = 0;
    const now = new Date();

    for (const config of configs) {
      // Get active transactions for this agent
      let transactions = await base44.asServiceRole.entities.Transaction.filter({
        agent_id: { $exists: true }
      });

      const agent = await base44.asServiceRole.entities.Agent.filter({
        user_email: config.agent_email
      });

      if (!agent || agent.length === 0) continue;

      transactions = transactions.filter(t => t.agent_id === agent[0].id);

      if (config.only_active_deals) {
        transactions = transactions.filter(t => t.status === 'active');
      }

      for (const txn of transactions) {
        // Check for inactive deal reminder
        if (config.inactive_deal_days > 0) {
          const messages = await base44.asServiceRole.entities.Message.filter({
            transaction_id: txn.id
          });

          const lastMessage = messages?.[0];
          const lastActivityDate = lastMessage ? new Date(lastMessage.created_date) : new Date(txn.created_date);
          const daysSinceActivity = Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24));

          if (daysSinceActivity >= config.inactive_deal_days) {
            // Check if reminder already exists
            const existing = await base44.asServiceRole.entities.Reminder.filter({
              transaction_id: txn.id,
              agent_email: config.agent_email,
              reminder_type: 'inactive_deal',
              status: { $in: ['pending', 'acknowledged'] }
            });

            if (!existing || existing.length === 0) {
              const property = txn.property_id ? await base44.asServiceRole.entities.Property.filter({ id: txn.property_id }) : null;

              await base44.asServiceRole.entities.Reminder.create({
                agent_email: config.agent_email,
                transaction_id: txn.id,
                reminder_type: 'inactive_deal',
                title: `Follow up on ${property?.[0]?.address || 'deal'}`,
                description: `This deal has been inactive for ${daysSinceActivity} days. Reach out to the buyer to check status.`,
                priority: daysSinceActivity > 14 ? 'high' : 'medium',
                metadata: {
                  property_address: property?.[0]?.address,
                  buyer_name: txn.buyer_email,
                  deal_value: txn.contract_price,
                  days_since_activity: daysSinceActivity
                },
                action_url: `${window.location.origin}/AgentTransactions`
              });
              processed++;
            }
          }
        }

        // Check for closing approaching reminder
        if (config.closing_date_days > 0 && txn.closing_date) {
          const closingDate = new Date(txn.closing_date);
          const daysUntilClose = Math.ceil((closingDate - now) / (1000 * 60 * 60 * 24));

          if (daysUntilClose > 0 && daysUntilClose <= config.closing_date_days) {
            const existing = await base44.asServiceRole.entities.Reminder.filter({
              transaction_id: txn.id,
              agent_email: config.agent_email,
              reminder_type: 'closing_approaching',
              status: { $in: ['pending', 'acknowledged'] }
            });

            if (!existing || existing.length === 0) {
              const property = txn.property_id ? await base44.asServiceRole.entities.Property.filter({ id: txn.property_id }) : null;

              await base44.asServiceRole.entities.Reminder.create({
                agent_email: config.agent_email,
                transaction_id: txn.id,
                reminder_type: 'closing_approaching',
                title: `Closing in ${daysUntilClose} day${daysUntilClose !== 1 ? 's' : ''}`,
                description: `Ensure all closing documents are ready and buyer is prepared for closing on ${closingDate.toLocaleDateString()}.`,
                priority: daysUntilClose <= 3 ? 'high' : 'medium',
                metadata: {
                  property_address: property?.[0]?.address,
                  buyer_name: txn.buyer_email,
                  deal_value: txn.contract_price,
                  closing_date: txn.closing_date
                },
                action_url: `${window.location.origin}/AgentTransactions`
              });
              processed++;
            }
          }
        }

        // Check for overdue milestone reminder
        if (config.overdue_milestone_days > 0) {
          const tasks = await base44.asServiceRole.entities.TransactionTask.filter({
            transaction_id: txn.id,
            status: { $ne: 'completed' }
          });

          for (const task of tasks) {
            if (!task.due_date) continue;
            const dueDate = new Date(task.due_date);
            const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

            if (daysOverdue >= config.overdue_milestone_days) {
              const existing = await base44.asServiceRole.entities.Reminder.filter({
                transaction_id: txn.id,
                agent_email: config.agent_email,
                reminder_type: 'overdue_milestone',
                status: { $in: ['pending', 'acknowledged'] }
              });

              if (!existing || existing.length === 0) {
                const property = txn.property_id ? await base44.asServiceRole.entities.Property.filter({ id: txn.property_id }) : null;

                await base44.asServiceRole.entities.Reminder.create({
                  agent_email: config.agent_email,
                  transaction_id: txn.id,
                  reminder_type: 'overdue_milestone',
                  title: `Overdue: ${task.title}`,
                  description: `Task "${task.title}" is ${daysOverdue} days overdue. Please complete or update status.`,
                  priority: 'high',
                  metadata: {
                    property_address: property?.[0]?.address,
                    buyer_name: txn.buyer_email,
                    deal_value: txn.contract_price
                  },
                  action_url: `${window.location.origin}/AgentTransactions`
                });
                processed++;
              }
            }
          }
        }

        // Check for no offer reminder (showing stage)
        if (config.no_offer_days > 0 && txn.current_stage === 'showing') {
          const stageStart = txn.stage_history?.find(s => s.stage === 'showing')?.entered_date;
          if (!stageStart) continue;

          const daysInShowing = Math.floor((now - new Date(stageStart)) / (1000 * 60 * 60 * 24));

          if (daysInShowing >= config.no_offer_days) {
            const existing = await base44.asServiceRole.entities.Reminder.filter({
              transaction_id: txn.id,
              agent_email: config.agent_email,
              reminder_type: 'no_offer',
              status: { $in: ['pending', 'acknowledged'] }
            });

            if (!existing || existing.length === 0) {
              const property = txn.property_id ? await base44.asServiceRole.entities.Property.filter({ id: txn.property_id }) : null;

              await base44.asServiceRole.entities.Reminder.create({
                agent_email: config.agent_email,
                transaction_id: txn.id,
                reminder_type: 'no_offer',
                title: `No offer after ${daysInShowing} days`,
                description: `Property has been in showing stage for ${daysInShowing} days without an offer. Follow up with buyer about interest or next steps.`,
                priority: 'medium',
                metadata: {
                  property_address: property?.[0]?.address,
                  buyer_name: txn.buyer_email,
                  deal_value: property?.[0]?.price
                },
                action_url: `${window.location.origin}/AgentTransactions`
              });
              processed++;
            }
          }
        }
      }
    }

    return Response.json({ processed });
  } catch (error) {
    console.error('Error generating reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});