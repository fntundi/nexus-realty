import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { INTERNAL_SECRET } from '../../shared/security.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    // Only internal automation calls (verified by shared secret) may run this
    if ((payload.internal_secret ?? payload.args?.internal_secret) !== INTERNAL_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This function is triggered when a new lead is created
    if (event?.type !== 'create' || event?.entity_name !== 'Lead') {
      return Response.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const leadId = event?.entity_id || data?.id;
    if (!leadId) {
      return Response.json({ error: 'Lead ID not found' }, { status: 400 });
    }

    // Call the autoAssignLead function
    const result = await base44.asServiceRole.functions.invoke('autoAssignLead', {
      lead_id: leadId
    });

    return Response.json({
      success: true,
      assignment_result: result?.data ?? result
    });
  } catch (error) {
    console.error('Error in triggerLeadAssignment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});