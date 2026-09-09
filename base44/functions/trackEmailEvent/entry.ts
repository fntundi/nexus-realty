import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { trackingId, eventType, link } = await req.json().catch(() => ({}));

    // This endpoint is intentionally anonymous: email open/click tracking is
    // performed by recipients who are not logged in, so the unguessable
    // tracking ID acts as the capability token and every input is strictly
    // validated instead.
    if (typeof trackingId !== 'string' || trackingId.length < 1 || trackingId.length > 256) {
      return Response.json({ error: 'Invalid tracking ID' }, { status: 400 });
    }
    if (eventType !== 'open' && eventType !== 'click') {
      return Response.json({ error: 'Invalid event type' }, { status: 400 });
    }
    if (eventType === 'click') {
      if (typeof link !== 'string' || link.length > 2048) {
        return Response.json({ error: 'Invalid link' }, { status: 400 });
      }
      try {
        const parsedLink = new URL(link);
        if (parsedLink.protocol !== 'https:' && parsedLink.protocol !== 'http:') throw new Error('bad protocol');
      } catch {
        return Response.json({ error: 'Invalid link' }, { status: 400 });
      }
    }

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
      const clickEvents = [...(campaign.click_events || []), {
        link,
        click_date: new Date().toISOString()
      }];
      // Cap stored events to prevent unbounded growth / analytics flooding
      updates.click_events = clickEvents.slice(-100);
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