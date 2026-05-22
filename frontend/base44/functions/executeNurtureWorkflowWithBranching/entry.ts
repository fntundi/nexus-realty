import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflow_id, lead_id } = await req.json();

    const workflow = await base44.entities.NurtureWorkflow.get(workflow_id);
    const lead = await base44.entities.Contact.get(lead_id);

    if (!workflow || !lead) {
      return Response.json({ error: 'Workflow or lead not found' }, { status: 404 });
    }

    // Find or create execution history
    let execution = workflow.execution_history?.find(e => e.lead_id === lead_id && e.status === 'in_progress');

    if (!execution) {
      execution = {
        lead_id,
        started_date: new Date().toISOString(),
        current_step: workflow.sequence_steps[0].step_id,
        status: 'in_progress',
        branch_path: [],
        ab_variant_assigned: {}
      };
    }

    // Get current step
    const currentStep = workflow.sequence_steps.find(s => s.step_id === execution.current_step);
    if (!currentStep) {
      return Response.json({ error: 'Invalid step ID' }, { status: 400 });
    }

    // Assign A/B variant if needed
    let variantId = execution.ab_variant_assigned[currentStep.step_id];
    if (currentStep.ab_test?.enabled && !variantId) {
      const rand = Math.random() * 100;
      let cumulative = 0;
      for (const variant of currentStep.ab_test.variants) {
        cumulative += variant.split_percentage;
        if (rand <= cumulative) {
          variantId = variant.variant_id;
          execution.ab_variant_assigned[currentStep.step_id] = variantId;
          break;
        }
      }
    }

    // Execute step actions
    const stepResults = { success: true, actions: [] };

    // Send email if applicable
    if (currentStep.action_type === 'email' || currentStep.action_type === 'both') {
      const emailTemplate = await base44.entities.EmailTemplate.get(currentStep.email_template_id);
      const variant = variantId && currentStep.ab_test?.variants.find(v => v.variant_id === variantId);

      const subject = variant?.subject_override || emailTemplate.subject;
      const body = variant?.body_override || emailTemplate.body;

      // Create email campaign
      const campaign = await base44.entities.EmailCampaign.create({
        contact_id: lead_id,
        sequence_id: workflow_id,
        template_id: currentStep.email_template_id,
        subject,
        body,
        recipient_email: lead.email,
        status: 'scheduled',
        variant_id: variantId,
        tracking_id: `${workflow_id}_${lead_id}_${Date.now()}`
      });

      stepResults.actions.push({ type: 'email', campaign_id: campaign.id });
    }

    // Create task if applicable
    if (currentStep.action_type === 'task' || currentStep.action_type === 'both') {
      const task = await base44.entities.Task.create({
        title: currentStep.task_title,
        description: `Workflow: ${workflow.name}`,
        task_type: currentStep.task_type,
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + currentStep.delay_hours * 3600000).toISOString(),
        assigned_to_email: user.email,
        contact_id: lead_id
      });

      stepResults.actions.push({ type: 'task', task_id: task.id });
    }

    // Determine next step based on conditions
    let nextStepId = null;

    if (currentStep.conditional_branches && currentStep.conditional_branches.length > 0) {
      for (const branch of currentStep.conditional_branches) {
        const conditionMet = await evaluateCondition(base44, branch, lead_id, workflow_id);

        if (conditionMet) {
          nextStepId = branch.next_step_id;
          execution.branch_path.push(`${currentStep.step_id} → ${nextStepId} (${branch.condition_type})`);
          break;
        } else if (branch.alternative_step_id) {
          nextStepId = branch.alternative_step_id;
          execution.branch_path.push(`${currentStep.step_id} → ${nextStepId} (${branch.condition_type} - false)`);
        }
      }
    }

    // Move to next sequential step if no conditions matched
    if (!nextStepId) {
      const nextIndex = workflow.sequence_steps.findIndex(s => s.step_id === currentStep.step_id) + 1;
      nextStepId = nextIndex < workflow.sequence_steps.length ? workflow.sequence_steps[nextIndex].step_id : null;
    }

    // Update execution
    execution.current_step = nextStepId || null;
    if (!nextStepId) {
      execution.status = 'completed';
      execution.completion_date = new Date().toISOString();
    }

    // Save workflow with updated execution
    const updatedWorkflow = {
      ...workflow,
      execution_history: workflow.execution_history?.map(e => e.lead_id === lead_id ? execution : e) || [execution]
    };

    await base44.entities.NurtureWorkflow.update(workflow_id, {
      execution_history: updatedWorkflow.execution_history
    });

    return Response.json({
      success: true,
      execution,
      step_results: stepResults,
      next_step: nextStepId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function evaluateCondition(base44, branch, lead_id, workflow_id) {
  const { condition_type, condition_details } = branch;

  switch (condition_type) {
    case 'email_opened': {
      const campaigns = await base44.entities.EmailCampaign.filter({
        contact_id: lead_id,
        sequence_id: workflow_id,
        status: 'sent'
      });
      return campaigns.some(c => c.open_count > 0);
    }

    case 'email_clicked': {
      const campaigns = await base44.entities.EmailCampaign.filter({
        contact_id: lead_id,
        sequence_id: workflow_id,
        status: 'sent'
      });
      return campaigns.some(c => c.click_count > 0);
    }

    case 'link_clicked': {
      const campaigns = await base44.entities.EmailCampaign.filter({
        contact_id: lead_id,
        sequence_id: workflow_id,
        status: 'sent'
      });
      return campaigns.some(c =>
        c.click_events?.some(e => e.link === condition_details.link_url)
      );
    }

    case 'no_action': {
      const campaigns = await base44.entities.EmailCampaign.filter({
        contact_id: lead_id,
        sequence_id: workflow_id
      });
      return campaigns.length === 0 || campaigns.every(c => c.open_count === 0 && c.click_count === 0);
    }

    case 'lead_score_change': {
      const contact = await base44.entities.Contact.get(lead_id);
      return contact.lead_score >= condition_details.score_threshold;
    }

    case 'days_elapsed': {
      const campaigns = await base44.entities.EmailCampaign.filter({
        contact_id: lead_id,
        sequence_id: workflow_id
      });

      if (campaigns.length === 0) return false;

      const lastCampaign = campaigns[campaigns.length - 1];
      const sentDate = new Date(lastCampaign.sent_date);
      const daysPassed = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);

      if (condition_details.comparison === 'greater_than') return daysPassed > condition_details.days;
      if (condition_details.comparison === 'less_than') return daysPassed < condition_details.days;
      if (condition_details.comparison === 'equals') return Math.abs(daysPassed - condition_details.days) < 1;
      return false;
    }

    default:
      return false;
  }
}