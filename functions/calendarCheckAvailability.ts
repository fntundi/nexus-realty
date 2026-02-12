import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start_time, end_time, user_email } = await req.json();

    if (!start_time || !end_time) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check agent's calendar connection
    const userConfigs = await base44.entities.AppConfig.filter({ 
      config_key: `calendar_connection_${user_email || user.email}` 
    });
    
    if (userConfigs.length === 0 || !userConfigs[0].config_value?.connected) {
      return Response.json({ 
        available: true,
        note: 'Calendar not connected, cannot check availability' 
      });
    }

    const provider = userConfigs[0].config_value.provider;

    if (provider === 'google') {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/freeBusy`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timeMin: start_time,
            timeMax: end_time,
            items: [{ id: 'primary' }]
          })
        }
      );

      if (!response.ok) {
        return Response.json({ available: true, note: 'Could not check calendar' });
      }

      const data = await response.json();
      const busy = data.calendars?.primary?.busy || [];
      
      const hasConflict = busy.some(busySlot => {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);
        const checkStart = new Date(start_time);
        const checkEnd = new Date(end_time);
        
        return (checkStart >= busyStart && checkStart < busyEnd) ||
               (checkEnd > busyStart && checkEnd <= busyEnd) ||
               (checkStart <= busyStart && checkEnd >= busyEnd);
      });

      return Response.json({
        available: !hasConflict,
        conflicts: busy,
        provider: 'google'
      });
    }

    return Response.json({ available: true, note: 'Provider not supported' });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      available: true, 
      note: 'Error checking availability: ' + error.message 
    });
  }
});