import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active sequences
    const sequences = await base44.asServiceRole.entities.EmailSequence.filter({
      is_active: true
    });

    let triggeredCount = 0;

    for (const sequence of sequences) {
      if (sequence.trigger_type === 'lead_score_threshold') {
        const scoreThreshold = parseInt(sequence.trigger_value);
        
        // Find contacts matching this threshold
        const contacts = await base44.asServiceRole.entities.Contact.filter({
          lead_score: { $gte: scoreThreshold }
        }, '-last_score_update', 100);

        for (const contact of contacts) {
          // Check if sequence was already sent to this contact
          const existingCampaign = await base44.asServiceRole.entities.EmailCampaign.filter({
            contact_id: contact.id,
            sequence_id: sequence.id
          });

          if (existingCampaign.length === 0) {
            // Trigger sequence
            await base44.asServiceRole.functions.invoke('sendEmailSequence', {
              contactId: contact.id,
              sequenceId: sequence.id
            });
            triggeredCount++;
          }
        }
      } else if (sequence.trigger_type === 'status_change') {
        const targetStatus = sequence.trigger_value;

        // Find contacts with this status
        const contacts = await base44.asServiceRole.entities.Contact.filter({
          status: targetStatus
        }, '-updated_date', 100);

        for (const contact of contacts) {
          const existingCampaign = await base44.asServiceRole.entities.EmailCampaign.filter({
            contact_id: contact.id,
            sequence_id: sequence.id
          });

          if (existingCampaign.length === 0) {
            await base44.asServiceRole.functions.invoke('sendEmailSequence', {
              contactId: contact.id,
              sequenceId: sequence.id
            });
            triggeredCount++;
          }
        }
      }
    }

    return Response.json({ success: true, triggeredCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});