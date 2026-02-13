import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { contact_id, workflow_id, agent_email } = await req.json();

    if (!contact_id || !workflow_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get contact and workflow
    const contact = await base44.asServiceRole.entities.Contact.get(contact_id);
    const workflow = await base44.asServiceRole.entities.OnboardingWorkflow.get(workflow_id);

    if (!contact || !workflow) {
      return Response.json({ error: 'Contact or workflow not found' }, { status: 404 });
    }

    const startDate = new Date();

    // Initialize checklist progress
    const checklistProgress = workflow.checklist_items.map((item, index) => {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (item.estimated_days || 7));
      
      return {
        item_index: index,
        title: item.title,
        completed: false,
        due_date: dueDate.toISOString().split('T')[0],
        notes: ''
      };
    });

    // Create onboarding progress record
    const onboardingProgress = await base44.asServiceRole.entities.OnboardingProgress.create({
      contact_id: contact_id,
      workflow_id: workflow_id,
      started_date: startDate.toISOString(),
      status: 'in_progress',
      checklist_progress: checklistProgress,
      completion_percentage: 0,
      assigned_agent_email: agent_email || contact.assigned_agent_email,
      welcome_message_sent: false,
      generated_task_ids: []
    });

    // Create auto-tasks
    const createdTasks = [];
    for (const autoTask of workflow.auto_tasks || []) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + autoTask.due_days_offset);

      let assignToEmail = agent_email || contact.assigned_agent_email;
      if (autoTask.assign_to === 'buyer') {
        assignToEmail = contact.email;
      }

      const task = await base44.asServiceRole.entities.Task.create({
        title: autoTask.task_title,
        description: autoTask.task_description,
        task_type: autoTask.task_type,
        priority: autoTask.priority,
        status: 'pending',
        due_date: dueDate.toISOString(),
        assigned_to_email: assignToEmail,
        contact_id: contact_id,
        contact_email: contact.email
      });

      createdTasks.push(task.id);
    }

    // Update progress with task IDs
    await base44.asServiceRole.entities.OnboardingProgress.update(onboardingProgress.id, {
      generated_task_ids: createdTasks
    });

    // Send welcome message if configured
    if (workflow.welcome_message?.send_immediately && workflow.welcome_message.subject) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: contact.email,
          subject: workflow.welcome_message.subject
            .replace('{{first_name}}', contact.first_name)
            .replace('{{last_name}}', contact.last_name),
          body: workflow.welcome_message.body
            .replace('{{first_name}}', contact.first_name)
            .replace('{{last_name}}', contact.last_name)
            .replace('{{agent_email}}', agent_email || contact.assigned_agent_email)
        });

        await base44.asServiceRole.entities.OnboardingProgress.update(onboardingProgress.id, {
          welcome_message_sent: true,
          welcome_message_sent_date: new Date().toISOString()
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    return Response.json({
      success: true,
      message: 'Client onboarding initiated successfully',
      onboarding_progress_id: onboardingProgress.id,
      tasks_created: createdTasks.length,
      checklist_items: checklistProgress.length
    });

  } catch (error) {
    console.error('Error triggering client onboarding:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});