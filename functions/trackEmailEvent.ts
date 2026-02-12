import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { trackingId, eventType, link } = await req.json();

    const base44 = createClientFromRequest(req);

    // Find campaign by tracking ID
    const campaigns = await base44.asServiceRole.entities.EmailCampaign.filter({
      tracking_id: trackingId
    });

    if (campaigns.length === 0) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaigns[0];
    const updates = {};

    if (eventType === 'open') {
      updates.open_count = (campaign.open_count || 0) + 1;
      updates.first_open_date = campaign.first_open_date || new Date().toISOString();
      updates.last_open_date = new Date().toISOString();
    } else if (eventType === 'click') {
      updates.click_count = (campaign.click_count || 0) + 1;
      const clickEvents = campaign.click_events || [];
      clickEvents.push({
        link,
        click_date: new Date().toISOString()
      });
      updates.click_events = clickEvents;
    }

    await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, updates);

    // Return tracking pixel or 204 for clicks
    if (eventType === 'open') {
      const pixel = Buffer.from('GIF89a', 'hex');
      return new Response(pixel, {
        headers: { 'Content-Type': 'image/gif' }
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});