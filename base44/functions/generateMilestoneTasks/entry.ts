import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { INTERNAL_SECRET } from '../../shared/security.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    // Direct calls pass fields at top level; the automation compatibility layer
    // passes the legacy event shape ({ event: {...}, data: {...} })
    const transaction_id = payload.transaction_id ?? payload.event?.entity_id;
    const trigger_stage = payload.trigger_stage ?? payload.data?.current_stage;
    const milestone_id = payload.milestone_id;

    // Authenticate: internal automation calls (verified by shared secret) or admin/agent users
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      if (!['admin', 'agent'].includes(user.role)) {
        return Response.json({ error: 'Forbidden: Insufficient role' }, { status: 403 });
      }
    } else if ((payload.internal_secret ?? payload.args?.internal_secret) !== INTERNAL_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!transaction_id || !trigger_stage) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get transaction details
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];
    
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Get applicable task templates
    const allTemplates = await base44.asServiceRole.entities.TaskTemplate.filter({
      is_active: true,
      trigger_stage: trigger_stage
    });

    // Filter templates based on trigger event and milestone
    const templates = milestone_id 
      ? allTemplates.filter(t => t.trigger_event === 'milestone_completed' && t.milestone_id === milestone_id)
      : allTemplates.filter(t => t.trigger_event === 'stage_entered');

    if (templates.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No templates found for this stage',
        tasks_created: 0 
      });
    }

    const createdTasks = [];

    for (const template of templates) {
      // Determine who to assign to
      let assignToEmail;
      if (template.assign_to_role === 'agent') {
        // Get agent from transaction
        const agents = await base44.asServiceRole.entities.Agent.filter({ id: transaction.agent_id });
        assignToEmail = agents[0]?.user_email;
      } else if (template.assign_to_role === 'buyer') {
        assignToEmail = transaction.buyer_email;
      } else if (template.assign_to_role === 'lender') {
        assignToEmail = transaction.lender_email;
      }

      if (!assignToEmail) continue; // Skip if no assignee found

      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.due_days_offset);

      // Replace variables in title and description
      const property = transaction.property_id 
        ? (await base44.asServiceRole.entities.Property.filter({ id: transaction.property_id }))[0]
        : null;

      let title = template.task_title
        .replace('{{property_address}}', property?.address || 'Property')
        .replace('{{stage}}', trigger_stage.replace(/_/g, ' '));

      let description = template.task_description
        .replace('{{property_address}}', property?.address || 'Property')
        .replace('{{stage}}', trigger_stage.replace(/_/g, ' '))
        .replace('{{buyer_name}}', transaction.buyer_email);

      // Create the task
      const task = await base44.asServiceRole.entities.Task.create({
        title: title,
        description: description,
        task_type: template.task_type,
        priority: template.priority,
        status: 'pending',
        due_date: dueDate.toISOString(),
        assigned_to_email: assignToEmail,
        transaction_id: transaction.id,
        contact_email: transaction.buyer_email
      });

      createdTasks.push(task);
    }

    return Response.json({
      success: true,
      message: `Created ${createdTasks.length} tasks`,
      tasks_created: createdTasks.length,
      tasks: createdTasks
    });

  } catch (error) {
    console.error('Error generating milestone tasks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});