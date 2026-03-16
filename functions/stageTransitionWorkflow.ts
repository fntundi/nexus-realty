import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Stage Transition Workflow Engine
 * Triggered when a Transaction's current_stage changes.
 * Executes all matching StageWorkflowRules for the from→to stage transition.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { transaction_id, from_stage, to_stage } = payload;

    if (!transaction_id || !to_stage) {
      return Response.json({ error: 'transaction_id and to_stage are required' }, { status: 400 });
    }

    // Fetch transaction
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [agentList, propertyList] = await Promise.all([
      transaction.agent_id
        ? base44.asServiceRole.entities.Agent.filter({ id: transaction.agent_id })
        : Promise.resolve([]),
      transaction.property_id
        ? base44.asServiceRole.entities.Property.filter({ id: transaction.property_id })
        : Promise.resolve([])
    ]);

    const agent = agentList[0] || null;
    const property = propertyList[0] || null;

    // Fetch all active workflow rules that match this transition
    const allRules = await base44.asServiceRole.entities.StageWorkflowRule.filter({ is_active: true });

    const matchingRules = allRules.filter(rule => {
      const stageMatches = rule.to_stage === to_stage && (rule.from_stage === 'any' || rule.from_stage === from_stage || !from_stage);
      const marketMatches = !rule.market_id || rule.market_id === transaction.market_id;
      return stageMatches && marketMatches;
    });

    if (matchingRules.length === 0) {
      return Response.json({
        success: true,
        message: `No workflow rules matched transition ${from_stage} → ${to_stage}`,
        rules_executed: 0,
        actions_performed: 0
      });
    }

    // Build template variable context
    const context = {
      '{{property_address}}': property?.address || 'the property',
      '{{city}}': property?.city || '',
      '{{stage}}': to_stage.replace(/_/g, ' '),
      '{{from_stage}}': (from_stage || '').replace(/_/g, ' '),
      '{{buyer_email}}': transaction.buyer_email || '',
      '{{agent_email}}': agent?.user_email || '',
      '{{lender_email}}': transaction.lender_email || '',
      '{{contract_price}}': transaction.contract_price ? `$${transaction.contract_price.toLocaleString()}` : 'TBD',
      '{{closing_date}}': transaction.closing_date || 'TBD',
    };

    function interpolate(text) {
      if (!text) return '';
      return Object.entries(context).reduce((str, [key, val]) => str.replaceAll(key, val), text);
    }

    function resolveAssignee(role) {
      if (role === 'agent') return agent?.user_email;
      if (role === 'buyer') return transaction.buyer_email;
      if (role === 'lender') return transaction.lender_email;
      return null;
    }

    let totalActionsPerformed = 0;
    const results = [];

    for (const rule of matchingRules) {
      const ruleResults = { rule_id: rule.id, rule_name: rule.name, actions: [] };

      for (const action of (rule.actions || [])) {
        try {
          if (action.action_type === 'create_task' || action.action_type === 'generate_checklist') {
            const assignee = resolveAssignee(action.assign_to_role);
            if (!assignee) {
              ruleResults.actions.push({ type: action.action_type, status: 'skipped', reason: 'No assignee found' });
              continue;
            }

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (action.due_days_offset || 3));

            const task = await base44.asServiceRole.entities.Task.create({
              title: interpolate(action.title),
              description: interpolate(action.description),
              task_type: 'follow_up',
              priority: action.priority || 'medium',
              status: 'pending',
              due_date: dueDate.toISOString(),
              assigned_to_email: assignee,
              transaction_id: transaction.id,
              contact_email: transaction.buyer_email,
              tags: ['auto-generated', `stage-${to_stage}`]
            });

            ruleResults.actions.push({ type: action.action_type, status: 'success', task_id: task.id });
            totalActionsPerformed++;

          } else if (action.action_type === 'send_notification') {
            const targetRoles = action.notify_roles || (action.assign_to_role ? [action.assign_to_role] : []);
            const notifyEmails = [...new Set(targetRoles.map(resolveAssignee).filter(Boolean))];

            for (const email of notifyEmails) {
              await base44.asServiceRole.entities.Notification.create({
                recipient_email: email,
                notification_type: 'deal_update',
                title: interpolate(action.title),
                message: interpolate(action.description),
                related_entity_type: 'transaction',
                related_entity_id: transaction.id,
                priority: action.priority || 'medium',
                metadata: { from_stage, to_stage, property_address: property?.address }
              });
            }

            ruleResults.actions.push({ type: 'send_notification', status: 'success', notified: notifyEmails.length });
            totalActionsPerformed++;

          } else if (action.action_type === 'send_email') {
            const targetRoles = action.notify_roles || (action.assign_to_role ? [action.assign_to_role] : []);
            const emailRecipients = [...new Set(targetRoles.map(resolveAssignee).filter(Boolean))];

            for (const email of emailRecipients) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: interpolate(action.title),
                body: interpolate(action.description)
              });
            }

            ruleResults.actions.push({ type: 'send_email', status: 'success', sent_to: emailRecipients.length });
            totalActionsPerformed++;
          }
        } catch (actionError) {
          console.error(`Action failed for rule ${rule.name}:`, actionError);
          ruleResults.actions.push({ type: action.action_type, status: 'error', error: actionError.message });
        }
      }

      // Update rule execution stats
      await base44.asServiceRole.entities.StageWorkflowRule.update(rule.id, {
        execution_count: (rule.execution_count || 0) + 1,
        last_executed: new Date().toISOString()
      });

      results.push(ruleResults);
    }

    console.log(`[WorkflowEngine] ${from_stage} → ${to_stage} | Rules: ${matchingRules.length} | Actions: ${totalActionsPerformed}`);

    return Response.json({
      success: true,
      transaction_id,
      transition: `${from_stage} → ${to_stage}`,
      rules_executed: matchingRules.length,
      actions_performed: totalActionsPerformed,
      results
    });

  } catch (error) {
    console.error('[WorkflowEngine] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});