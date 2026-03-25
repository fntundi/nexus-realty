import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contactId, sequenceId } = await req.json();

    const contact = await base44.entities.Contact.get(contactId);
    const sequence = await base44.entities.EmailSequence.get(sequenceId);

    if (!contact || !sequence) {
      return Response.json({ error: 'Contact or sequence not found' }, { status: 404 });
    }

    const sentEmails = [];

    for (const emailConfig of sequence.emails) {
      const template = await base44.entities.EmailTemplate.get(emailConfig.template_id);

      // Personalize template
      let subject = template.subject;
      let body = template.body;

      const variables = {
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        company: contact.company || 'N/A',
        lead_score: contact.lead_score || 0,
        contact_type: contact.contact_type || 'N/A',
        status: contact.status || 'N/A'
      };

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      });

      // Create tracking ID
      const trackingId = `${contactId}-${emailConfig.template_id}-${Date.now()}`;

      // Create campaign record
      const campaign = await base44.entities.EmailCampaign.create({
        contact_id: contactId,
        sequence_id: sequenceId,
        template_id: emailConfig.template_id,
        subject,
        body,
        recipient_email: contact.email,
        tracking_id: trackingId,
        status: 'sent',
        sent_date: new Date().toISOString()
      });

      // Send email via Core integration
      await base44.integrations.Core.SendEmail({
        to: contact.email,
        subject,
        body
      });

      sentEmails.push({
        campaignId: campaign.id,
        template: template.name,
        sentTo: contact.email
      });
    }

    // Update sequence execution count
    await base44.entities.EmailSequence.update(sequenceId, {
      execution_count: (sequence.execution_count || 0) + 1
    });

    return Response.json({ success: true, sentEmails });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});