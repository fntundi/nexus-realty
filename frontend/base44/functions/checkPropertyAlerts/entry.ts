import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all saved searches with alerts enabled
    const savedSearches = await base44.asServiceRole.entities.SavedSearch.filter({ send_alerts: true });

    if (!savedSearches || savedSearches.length === 0) {
      return Response.json({ success: true, message: 'No active alerts' });
    }

    const now = new Date();
    let alertsSent = 0;
    let alertsSkipped = 0;

    for (const search of savedSearches) {
      // Check if it's time to send alert based on frequency
      const lastAlert = search.last_alert_date ? new Date(search.last_alert_date) : null;
      const shouldSend = shouldSendAlert(lastAlert, search.alert_frequency, now);

      if (!shouldSend) {
        alertsSkipped++;
        continue;
      }

      // Get all active properties
      const properties = await base44.asServiceRole.entities.Property.filter({ status: 'active' });

      if (!properties) {
        continue;
      }

      // Filter properties matching the saved search criteria
      const matchingProperties = filterPropertiesAgainstSearch(properties, search);

      // Get properties that haven't been alerted about yet
      const alreadyAlerted = new Set(search.alert_properties_sent || []);
      const newProperties = matchingProperties.filter(p => !alreadyAlerted.has(p.id));

      if (newProperties.length === 0) {
        continue;
      }

      // Send email notification
      const market = await base44.asServiceRole.entities.Market.filter({ id: search.market_id });
      const marketName = market?.[0]?.name || 'Market';

      const propertyList = newProperties
        .slice(0, 5) // Show top 5
        .map(p => `${p.address}, ${p.city} - $${p.price.toLocaleString()} (${p.bedrooms}bed/${p.bathrooms}bath)`)
        .join('\n');

      const emailBody = `
New properties matching your saved search "${search.search_name}" in ${marketName}:

${propertyList}

${newProperties.length > 5 ? `\n+ ${newProperties.length - 5} more properties` : ''}

View all results: ${generateSearchLink(search)}
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: search.user_email,
        subject: `${newProperties.length} new ${search.search_name} properties found`,
        body: emailBody
      });

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: search.user_email,
        notification_type: 'system',
        title: `${newProperties.length} new properties match "${search.search_name}"`,
        message: `${newProperties.length} properties matching your saved search have been added. ${newProperties[0] ? `New: ${newProperties[0].address}` : ''}`,
        action_url: generateSearchLink(search),
        priority: 'medium'
      });

      // Update saved search with new property IDs and last alert date
      const updatedIds = [...(search.alert_properties_sent || []), ...newProperties.map(p => p.id)];
      await base44.asServiceRole.entities.SavedSearch.update(search.id, {
        alert_properties_sent: updatedIds.slice(-100), // Keep last 100 to avoid bloat
        last_alert_date: now.toISOString(),
        result_count: newProperties.length
      });

      alertsSent++;
    }

    return Response.json({
      success: true,
      alerts_sent: alertsSent,
      alerts_skipped: alertsSkipped
    });
  } catch (error) {
    console.error('Error in checkPropertyAlerts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function shouldSendAlert(lastAlertDate, frequency, now) {
  if (!lastAlertDate) return true;

  const daysSinceLastAlert = (now - lastAlertDate) / (1000 * 60 * 60 * 24);

  switch (frequency) {
    case 'immediately':
      return true;
    case 'daily':
      return daysSinceLastAlert >= 1;
    case 'weekly':
      return daysSinceLastAlert >= 7;
    default:
      return false;
  }
}

function filterPropertiesAgainstSearch(properties, search) {
  const filters = search.filters || {};

  return properties.filter(property => {
    // Price filter
    if (filters.price_min && property.price < filters.price_min) return false;
    if (filters.price_max && property.price > filters.price_max) return false;

    // Bedrooms filter
    if (filters.bedrooms_min && property.bedrooms < filters.bedrooms_min) return false;
    if (filters.bedrooms_max && property.bedrooms > filters.bedrooms_max) return false;

    // Bathrooms filter
    if (filters.bathrooms_min && property.bathrooms < filters.bathrooms_min) return false;
    if (filters.bathrooms_max && property.bathrooms > filters.bathrooms_max) return false;

    // Property type filter
    if (filters.property_types && filters.property_types.length > 0) {
      if (!filters.property_types.includes(property.property_type)) return false;
    }

    // Location filter
    if (filters.location_keywords && filters.location_keywords.length > 0) {
      const matchLocation = filters.location_keywords.some(keyword =>
        property.address?.toLowerCase().includes(keyword.toLowerCase()) ||
        property.city?.toLowerCase().includes(keyword.toLowerCase()) ||
        property.state?.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!matchLocation) return false;
    }

    return true;
  });
}

function generateSearchLink(search) {
  const params = new URLSearchParams({
    market: search.market_id,
    saved_search: search.id
  });
  return `/property-search?${params.toString()}`;
}