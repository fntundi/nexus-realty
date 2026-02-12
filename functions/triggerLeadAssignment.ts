import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

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
      assignment_result: result
    });
  } catch (error) {
    console.error('Error in triggerLeadAssignment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});