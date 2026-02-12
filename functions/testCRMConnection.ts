import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connection_id } = await req.json();
    const connection = await base44.entities.CRMConnection.get(connection_id);

    if (!connection) {
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.crm_type === 'salesforce') {
      return await testSalesforceConnection(base44, connection);
    } else if (connection.crm_type === 'hubspot') {
      return await testHubSpotConnection(connection);
    }

    return Response.json({ error: 'Invalid CRM type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function testSalesforceConnection(base44, connection) {
  try {
    if (!connection.salesforce_config?.instance_url) {
      return Response.json({ error: 'Instance URL not configured' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('salesforce');

    if (!accessToken) {
      return Response.json({ error: 'Salesforce authorization required' }, { status: 401 });
    }

    const response = await fetch(
      `${connection.salesforce_config.instance_url}/services/data/v57.0/sobjects/Lead?limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to connect to Salesforce');
    }

    // Update connection status
    await base44.asServiceRole.entities.CRMConnection.update(connection.id, {
      last_sync_date: new Date().toISOString(),
      last_sync_status: 'success',
      last_sync_error: null
    });

    return Response.json({
      success: true,
      message: 'Salesforce connection test passed',
      crm_type: 'salesforce'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

async function testHubSpotConnection(connection) {
  try {
    if (!connection.hubspot_config?.private_app_key) {
      return Response.json({ error: 'API key not configured' }, { status: 400 });
    }

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: {
        'Authorization': `Bearer ${connection.hubspot_config.private_app_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to connect to HubSpot');
    }

    return Response.json({
      success: true,
      message: 'HubSpot connection test passed',
      crm_type: 'hubspot'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}