import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { campaign_id } = body;

    // Fetch campaigns to process
    const allCampaigns = campaign_id
      ? [await base44.asServiceRole.entities.DripCampaign.get(campaign_id)]
      : await base44.asServiceRole.entities.DripCampaign.filter({ is_active: true });

    const contacts = await base44.asServiceRole.entities.Contact.list('-updated_date', 500);
    const interactions = await base44.asServiceRole.entities.Interaction.list('-interaction_date', 500);
    const existingEnrollments = await base44.asServiceRole.entities.DripEnrollment.list('-enrolled_date', 1000);

    const now = new Date();
    let totalEnrolled = 0;
    let totalSent = 0;

    for (const campaign of allCampaigns) {
      if (!campaign || !campaign.is_active) continue;
      const steps = campaign.steps || [];
      if (steps.length === 0) continue;

      const cfg = campaign.trigger_config || {};
      const campaignEnrollments = existingEnrollments.filter(e => e.campaign_id === campaign.id);

      // ── Step 1: Find newly eligible contacts and enroll them ──
      let eligibleContacts = [];

      for (const contact of contacts) {
        // Filter by contact type
        if (cfg.contact_type && cfg.contact_type !== 'any' && contact.contact_type !== cfg.contact_type) continue;

        // Check not already enrolled in this campaign
        const alreadyEnrolled = campaignEnrollments.find(
          e => e.contact_id === contact.id && (e.status === 'active' || e.status === 'completed')
        );
        if (alreadyEnrolled) continue;

        let eligible = false;

        if (campaign.trigger_type === 'score_threshold') {
          const score = contact.lead_score || 0;
          eligible = score >= (cfg.score_min || 0) && score <= (cfg.score_max || 100);
        }

        if (campaign.trigger_type === 'score_increase') {
          const history = contact.score_history || [];
          if (history.length >= 2) {
            const latest = history[history.length - 1]?.score || 0;
            const prev   = history[history.length - 2]?.score || 0;
            eligible = (latest - prev) >= (cfg.score_increase_by || 10);
          }
        }

        if (campaign.trigger_type === 'inactivity') {
          const contactInteractions = interactions.filter(i => i.contact_id === contact.id);
          const lastDate = contactInteractions.length > 0
            ? new Date(contactInteractions.sort((a, b) => new Date(b.interaction_date) - new Date(a.interaction_date))[0].interaction_date)
            : new Date(contact.created_date || 0);
          const daysSince = (now - lastDate) / 86400000;
          eligible = daysSince >= (cfg.inactivity_days || 14);
        }

        if (campaign.trigger_type === 'manual') eligible = false; // manual only

        if (eligible) eligibleContacts.push(contact);
      }

      // Enroll eligible contacts
      for (const contact of eligibleContacts) {
        const firstStep = steps[0];
        const nextSendDate = new Date(now.getTime() + (firstStep.delay_days || 0) * 86400000);
        await base44.asServiceRole.entities.DripEnrollment.create({
          campaign_id: campaign.id,
          contact_id: contact.id,
          contact_email: contact.email,
          contact_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          status: 'active',
          current_step: 1,
          enrolled_date: now.toISOString(),
          next_send_date: nextSendDate.toISOString(),
          trigger_score: contact.lead_score || 0,
          completed_steps: [],
        });
        totalEnrolled++;
      }

      // ── Step 2: Process pending sends for active enrollments ──
      const activeEnrollments = [...campaignEnrollments, ...eligibleContacts.map(c => ({ // re-query logic handled below
        campaign_id: campaign.id, contact_id: c.id, contact_email: c.email, current_step: 1, next_send_date: now.toISOString()
      }))].filter(e => e.status === 'active');

      // Re-fetch to get newly created ones too
      const freshEnrollments = await base44.asServiceRole.entities.DripEnrollment.filter({ campaign_id: campaign.id });
      const pendingSends = freshEnrollments.filter(e =>
        e.status === 'active' && e.next_send_date && new Date(e.next_send_date) <= now
      );

      for (const enrollment of pendingSends) {
        const stepIdx = (enrollment.current_step || 1) - 1;
        const step = steps[stepIdx];
        if (!step) {
          // Completed all steps
          await base44.asServiceRole.entities.DripEnrollment.update(enrollment.id, { status: 'completed' });
          continue;
        }

        // Find contact details for template variables
        const contact = contacts.find(c => c.id === enrollment.contact_id);
        const firstName = contact?.first_name || 'there';

        // Interpolate template variables
        const interpolate = (text) => (text || '')
          .replace(/{{first_name}}/g, firstName)
          .replace(/{{last_name}}/g, contact?.last_name || '')
          .replace(/{{lead_score}}/g, contact?.lead_score || 0)
          .replace(/{{agent_name}}/g, user.full_name || 'Your Agent');

        // Send the message
        let sendStatus = 'sent';
        try {
          if (step.channel === 'email' && enrollment.contact_email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: enrollment.contact_email,
              subject: interpolate(step.subject) || 'Message from your agent',
              body: `<p>${interpolate(step.message).replace(/\n/g, '<br/>')}</p>`,
              from_name: step.from_name || user.full_name || 'Your Agent',
            });
          } else if (step.channel === 'notification') {
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: enrollment.contact_email,
              notification_type: 'system',
              title: interpolate(step.subject) || 'Message from your agent',
              message: interpolate(step.message),
              is_read: false,
              priority: 'medium',
            });
          }
          totalSent++;
        } catch (e) {
          console.error(`Failed to send step ${step.step_number} for enrollment ${enrollment.id}:`, e.message);
          sendStatus = 'failed';
        }

        // Update enrollment
        const completedSteps = [...(enrollment.completed_steps || []), {
          step_number: step.step_number,
          sent_date: now.toISOString(),
          channel: step.channel,
          status: sendStatus,
        }];

        const nextStepIdx = stepIdx + 1;
        const nextStep = steps[nextStepIdx];

        if (!nextStep) {
          // Last step done
          await base44.asServiceRole.entities.DripEnrollment.update(enrollment.id, {
            status: 'completed',
            completed_steps: completedSteps,
            last_sent_date: now.toISOString(),
          });
        } else {
          const nextSend = new Date(now.getTime() + (nextStep.delay_days || 1) * 86400000);
          await base44.asServiceRole.entities.DripEnrollment.update(enrollment.id, {
            current_step: nextStepIdx + 1,
            next_send_date: nextSend.toISOString(),
            last_sent_date: now.toISOString(),
            completed_steps: completedSteps,
          });
        }
      }

      // Update campaign stats
      await base44.asServiceRole.entities.DripCampaign.update(campaign.id, {
        last_executed: now.toISOString(),
        execution_count: (campaign.execution_count || 0) + 1,
        enrolled_count: (campaign.enrolled_count || 0) + eligibleContacts.length,
      });
    }

    return Response.json({ success: true, enrolled: totalEnrolled, sent: totalSent });
  } catch (error) {
    console.error('Drip campaign error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});