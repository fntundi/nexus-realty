import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all in-progress onboarding
    const allProgress = await base44.asServiceRole.entities.OnboardingProgress.filter({
      status: 'in_progress'
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const remindersSent = [];

    for (const progress of allProgress) {
      // Get workflow and contact
      const workflow = await base44.asServiceRole.entities.OnboardingWorkflow.get(progress.workflow_id);
      const contact = await base44.asServiceRole.entities.Contact.get(progress.contact_id);

      if (!workflow || !contact) continue;

      // Check for overdue items
      const overdueItems = progress.checklist_progress.filter(item => {
        if (item.completed) return false;
        const dueDate = new Date(item.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      });

      // Check for upcoming items (within reminder window)
      const upcomingItems = [];
      for (const item of progress.checklist_progress) {
        if (item.completed) continue;
        
        const workflowItem = workflow.checklist_items[item.item_index];
        if (!workflowItem?.reminder_before_days) continue;

        const dueDate = new Date(item.due_date);
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - workflowItem.reminder_before_days);
        reminderDate.setHours(0, 0, 0, 0);

        if (reminderDate <= today && dueDate >= today) {
          upcomingItems.push({ item, workflowItem });
        }
      }

      // Send reminders if needed
      if (overdueItems.length > 0 || upcomingItems.length > 0) {
        const lastReminder = progress.last_reminder_sent ? new Date(progress.last_reminder_sent) : null;
        const daysSinceReminder = lastReminder ? (today - lastReminder) / (1000 * 60 * 60 * 24) : 999;

        // Don't send more than once per day
        if (daysSinceReminder < 1) continue;

        let emailBody = `Hi ${contact.first_name},\n\n`;
        emailBody += `This is a reminder about your onboarding progress:\n\n`;

        if (overdueItems.length > 0) {
          emailBody += `Overdue Items:\n`;
          overdueItems.forEach(item => {
            emailBody += `- ${item.title} (Due: ${new Date(item.due_date).toLocaleDateString()})\n`;
          });
          emailBody += `\n`;
        }

        if (upcomingItems.length > 0) {
          emailBody += `Upcoming Items:\n`;
          upcomingItems.forEach(({ item }) => {
            emailBody += `- ${item.title} (Due: ${new Date(item.due_date).toLocaleDateString()})\n`;
          });
        }

        emailBody += `\nIf you have any questions, please contact your agent at ${progress.assigned_agent_email}.\n\n`;
        emailBody += `Best regards,\nYour Real Estate Team`;

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: contact.email,
            subject: `Onboarding Reminder: ${workflow.name}`,
            body: emailBody
          });

          await base44.asServiceRole.entities.OnboardingProgress.update(progress.id, {
            last_reminder_sent: new Date().toISOString()
          });

          remindersSent.push({
            contact_id: contact.id,
            contact_name: `${contact.first_name} ${contact.last_name}`,
            overdue_count: overdueItems.length,
            upcoming_count: upcomingItems.length
          });
        } catch (emailError) {
          console.error(`Failed to send reminder to ${contact.email}:`, emailError);
        }
      }
    }

    return Response.json({
      success: true,
      reminders_sent: remindersSent.length,
      details: remindersSent
    });

  } catch (error) {
    console.error('Error sending onboarding reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});