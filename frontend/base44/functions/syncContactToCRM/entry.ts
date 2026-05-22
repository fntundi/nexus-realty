import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contact_id, crm_type } = await req.json();

    // Get contact and CRM connection
    const contact = await base44.entities.Contact.get(contact_id);
    const connections = await base44.entities.CRMConnection.filter({ crm_type, enabled: true });
    
    if (!connections.length) {
      return Response.json({ error: `No enabled ${crm_type} connection found` }, { status: 404 });
    }

    const connection = connections[0];

    if (crm_type === 'salesforce') {
      return await syncToSalesforce(base44, contact, connection);
    } else if (crm_type === 'hubspot') {
      return await syncToHubSpot(base44, contact, connection);
    }

    return Response.json({ error: 'Invalid CRM type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function syncToSalesforce(base44, contact, connection) {
  try {
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('salesforce');
    const instanceUrl = connection.salesforce_config?.instance_url;

    if (!instanceUrl || !accessToken) {
      return Response.json({ error: 'Salesforce not properly configured' }, { status: 400 });
    }

    // Prepare lead data based on mapping
    const leadData = buildLeadPayload(contact, connection.salesforce_config?.lead_object_mapping);

    // Create or update lead in Salesforce
    const response = await fetch(`${instanceUrl}/services/data/v57.0/sobjects/Lead`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(leadData)
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ error: result.message || 'Salesforce sync failed' }, { status: 400 });
    }

    // Update sync stats
    await base44.asServiceRole.entities.CRMConnection.update(connection.id, {
      last_sync_date: new Date().toISOString(),
      last_sync_status: 'success',
      sync_stats: {
        ...connection.sync_stats,
        leads_synced: (connection.sync_stats?.leads_synced || 0) + 1
      }
    });

    return Response.json({
      success: true,
      crm_id: result.id,
      message: 'Contact synced to Salesforce',
      sync_stats: { leads_synced: 1 }
    });
  } catch (error) {
    await updateSyncError(base44, connection, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function syncToHubSpot(base44, contact, connection) {
  try {
    const apiKey = connection.hubspot_config?.private_app_key;

    if (!apiKey) {
      return Response.json({ error: 'HubSpot API key not configured' }, { status: 400 });
    }

    // Prepare contact data based on mapping
    const contactData = buildHubSpotContactPayload(contact, connection.hubspot_config?.contact_object_mapping);

    // Create or update contact in HubSpot
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ properties: contactData })
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ error: result.message || 'HubSpot sync failed' }, { status: 400 });
    }

    // Update sync stats
    await base44.asServiceRole.entities.CRMConnection.update(connection.id, {
      last_sync_date: new Date().toISOString(),
      last_sync_status: 'success',
      sync_stats: {
        ...connection.sync_stats,
        leads_synced: (connection.sync_stats?.leads_synced || 0) + 1
      }
    });

    return Response.json({
      success: true,
      crm_id: result.id,
      message: 'Contact synced to HubSpot',
      sync_stats: { leads_synced: 1 }
    });
  } catch (error) {
    await updateSyncError(base44, connection, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildLeadPayload(contact, mapping = {}) {
  const defaultMapping = {
    FirstName: 'first_name',
    LastName: 'last_name',
    Email: 'email',
    Phone: 'phone',
    Company: 'company'
  };

  const finalMapping = { ...defaultMapping, ...mapping };
  const payload = {};

  for (const [sfField, contactField] of Object.entries(finalMapping)) {
    if (contact[contactField]) {
      payload[sfField] = contact[contactField];
    }
  }

  return payload;
}

function buildHubSpotContactPayload(contact, mapping = {}) {
  const defaultMapping = {
    firstname: 'first_name',
    lastname: 'last_name',
    email: 'email',
    phone: 'phone',
    company: 'company'
  };

  const finalMapping = { ...defaultMapping, ...mapping };
  const payload = [];

  for (const [hsField, contactField] of Object.entries(finalMapping)) {
    if (contact[contactField]) {
      payload.push({
        property: hsField,
        value: String(contact[contactField])
      });
    }
  }

  return payload;
}

async function updateSyncError(base44, connection, errorMessage) {
  try {
    await base44.asServiceRole.entities.CRMConnection.update(connection.id, {
      last_sync_date: new Date().toISOString(),
      last_sync_status: 'failed',
      last_sync_error: errorMessage,
      sync_stats: {
        ...connection.sync_stats,
        failed_sync_attempts: (connection.sync_stats?.failed_sync_attempts || 0) + 1
      }
    });
  } catch (err) {
    console.error('Failed to update sync error:', err);
  }
}