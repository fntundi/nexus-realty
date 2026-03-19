import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { showing_id } = await req.json();

    if (!showing_id) {
      return Response.json({ error: 'Missing showing_id' }, { status: 400 });
    }

    const showings = await base44.entities.Showing.filter({ id: showing_id });
    const showing = showings[0];

    if (!showing || !showing.calendar_event_id) {
      return Response.json({ error: 'No calendar event to delete' }, { status: 404 });
    }

    if (showing.calendar_provider === 'google') {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${showing.calendar_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok && response.status !== 404) {
        return Response.json({ error: 'Failed to delete calendar event' }, { status: 500 });
      }

      await base44.asServiceRole.entities.Showing.update(showing_id, {
        calendar_event_id: null,
        calendar_provider: null,
        calendar_link: null
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unsupported provider' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});