import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId, leadId } = await req.json();

    // Fetch workflow
    const workflow = await base44.asServiceRole.entities.NurtureWorkflow.get(workflowId);
    if (!workflow) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Fetch lead and related data
    const lead = await base44.asServiceRole.entities.Lead.get(leadId);
    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const contact = await base44.asServiceRole.entities.Contact.filter({
      email: lead.contact_email
    }).then(c => c[0]).catch(() => null);

    const interactions = await base44.asServiceRole.entities.Interaction.filter({
      related_lead_id: leadId
    }, '-interaction_date').catch(() => []);

    // Initialize workflow execution
    const executionRecord = {
      lead_id: leadId,
      workflow_id: workflowId,
      started_date: new Date().toISOString(),
      current_step: 0,
      status: 'in_progress',
      completions: []
    };

    // Process each step in sequence
    for (const step of workflow.sequence_steps) {
      try {
        // Wait for delay
        if (step.delay_hours > 0) {
          await new Promise(resolve => setTimeout(resolve, step.delay_hours * 3600 * 1000));
        }

        // Send email if needed
        if (['email', 'both'].includes(step.action_type) && step.email_template_id) {
          const template = await base44.asServiceRole.entities.EmailTemplate.get(step.email_template_id);
          if (template) {
            // Personalize email content
            let subject = template.subject;
            let body = template.body;

            // Replace variables
            subject = subject.replace('{{first_name}}', contact?.first_name || 'Prospect')
              .replace('{{lead_score}}', lead.lead_score || '0');
            body = body.replace('{{first_name}}', contact?.first_name || 'Prospect')
              .replace('{{lead_score}}', lead.lead_score || '0')
              .replace('{{last_interaction}}', interactions[0]?.subject || 'previous interaction');

            // Create email campaign
            await base44.asServiceRole.entities.EmailCampaign.create({
              contact_id: contact?.id,
              sequence_id: null,
              template_id: step.email_template_id,
              subject,
              body,
              recipient_email: lead.contact_email,
              sent_date: new Date().toISOString(),
              status: 'sent'
            });
          }
        }

        // Create task if needed
        if (['task', 'both'].includes(step.action_type) && step.task_title) {
          const dueDate = new Date();
          dueDate.setHours(dueDate.getHours() + (step.delay_hours || 24));

          await base44.asServiceRole.entities.Task.create({
            title: step.task_title,
            task_type: step.task_type || 'follow_up',
            description: `Auto-generated from nurture workflow: ${workflow.name}`,
            status: 'pending',
            priority: 'medium',
            due_date: dueDate.toISOString(),
            assigned_to_email: user.email,
            contact_id: contact?.id,
            contact_email: lead.contact_email
          });
        }

        executionRecord.completions.push({
          step: step.order,
          completed_date: new Date().toISOString(),
          status: 'success'
        });

        executionRecord.current_step = step.order;
      } catch (stepError) {
        executionRecord.completions.push({
          step: step.order,
          completed_date: new Date().toISOString(),
          status: 'failed',
          error: stepError.message
        });
      }
    }

    // Update workflow execution history
    workflow.execution_history = workflow.execution_history || [];
    workflow.execution_history.push({
      lead_id: leadId,
      started_date: executionRecord.started_date,
      current_step: executionRecord.current_step,
      status: 'completed',
      completion_date: new Date().toISOString()
    });

    // Update engagement metrics
    if (!workflow.engagement_metrics) {
      workflow.engagement_metrics = {
        total_triggered: 0,
        completed: 0,
        conversion_rate: 0,
        avg_time_to_conversion: 0,
        email_open_rate: 0,
        email_click_rate: 0
      };
    }

    workflow.engagement_metrics.total_triggered = (workflow.engagement_metrics.total_triggered || 0) + 1;
    workflow.engagement_metrics.completed = (workflow.engagement_metrics.completed || 0) + 1;

    await base44.asServiceRole.entities.NurtureWorkflow.update(workflowId, workflow);

    return Response.json({
      success: true,
      execution: executionRecord,
      message: `Workflow executed successfully for lead ${leadId}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});