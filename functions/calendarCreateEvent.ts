import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if calendar integration is enabled
    const configs = await base44.entities.AppConfig.filter({ config_key: 'calendar_settings' });
    const calendarConfig = configs[0]?.config_value || {};
    
    if (!calendarConfig.enabled) {
      return Response.json({ 
        error: 'Calendar integration is not enabled' 
      }, { status: 400 });
    }

    const { showing_id, provider } = await req.json();

    if (!showing_id || !provider) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get showing details
    const showings = await base44.entities.Showing.filter({ id: showing_id });
    const showing = showings[0];

    if (!showing) {
      return Response.json({ error: 'Showing not found' }, { status: 404 });
    }

    // Get property and transaction details
    const properties = await base44.entities.Property.filter({ id: showing.property_id });
    const property = properties[0];

    const transactions = await base44.entities.Transaction.filter({ id: showing.transaction_id });
    const transaction = transactions[0];

    if (provider === 'google') {
      // Get access token from app connector
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

      const event = {
        summary: `Property Showing: ${property?.address || 'Property'}`,
        description: `Showing scheduled with ${showing.buyer_email}\n\nProperty: ${property?.address || 'N/A'}\nNotes: ${showing.notes || 'None'}`,
        location: showing.location || property?.address || '',
        start: {
          dateTime: showing.proposed_date,
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: new Date(new Date(showing.proposed_date).getTime() + (showing.duration_minutes || 60) * 60000).toISOString(),
          timeZone: 'America/New_York'
        },
        attendees: [
          { email: showing.buyer_email },
          { email: showing.agent_email }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        const error = await response.text();
        return Response.json({ error: 'Failed to create calendar event', details: error }, { status: 500 });
      }

      const eventData = await response.json();

      // Update showing with calendar event ID
      await base44.asServiceRole.entities.Showing.update(showing_id, {
        calendar_event_id: eventData.id,
        calendar_provider: 'google',
        calendar_link: eventData.htmlLink
      });

      return Response.json({
        success: true,
        event_id: eventData.id,
        event_link: eventData.htmlLink
      });
    }

    return Response.json({ error: 'Unsupported calendar provider' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});