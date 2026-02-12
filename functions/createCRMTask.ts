import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id, crm_type } = await req.json();

    // Get task and CRM connection
    const task = await base44.entities.Task.get(task_id);
    const connections = await base44.entities.CRMConnection.filter({ crm_type, enabled: true });
    
    if (!connections.length) {
      return Response.json({ error: `No enabled ${crm_type} connection found` }, { status: 404 });
    }

    const connection = connections[0];

    if (crm_type === 'salesforce') {
      return await createTaskInSalesforce(base44, task, connection);
    } else if (crm_type === 'hubspot') {
      return await createTaskInHubSpot(base44, task, connection);
    }

    return Response.json({ error: 'Invalid CRM type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function createTaskInSalesforce(base44, task, connection) {
  try {
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('salesforce');
    const instanceUrl = connection.salesforce_config?.instance_url;

    if (!instanceUrl || !accessToken) {
      return Response.json({ error: 'Salesforce not properly configured' }, { status: 400 });
    }

    const taskPayload = {
      Subject: task.title,
      Description: task.description || '',
      ActivityDate: task.due_date?.split('T')[0],
      OwnerId: task.assigned_to_email,
      Status: 'Not Started'
    };

    const response = await fetch(`${instanceUrl}/services/data/v57.0/sobjects/Task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ error: result.message || 'Task creation failed' }, { status: 400 });
    }

    // Update sync stats
    await base44.asServiceRole.entities.CRMConnection.update(connection.id, {
      sync_stats: {
        ...connection.sync_stats,
        tasks_created: (connection.sync_stats?.tasks_created || 0) + 1
      }
    });

    return Response.json({
      success: true,
      crm_task_id: result.id,
      message: 'Task created in Salesforce'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function createTaskInHubSpot(base44, task, connection) {
  try {
    const apiKey = connection.hubspot_config?.private_app_key;

    if (!apiKey) {
      return Response.json({ error: 'HubSpot API key not configured' }, { status: 400 });
    }

    const taskPayload = {
      properties: [
        { property: 'hs_task_subject', value: task.title },
        { property: 'hs_task_body', value: task.description || '' },
        { property: 'hs_task_due_date', value: task.due_date },
        { property: 'hs_task_status', value: 'NOT_STARTED' }
      ]
    };

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ error: result.message || 'Task creation failed' }, { status: 400 });
    }

    // Update sync stats
    await base44.asServiceRole.entities.CRMConnection.update(connection.id, {
      sync_stats: {
        ...connection.sync_stats,
        tasks_created: (connection.sync_stats?.tasks_created || 0) + 1
      }
    });

    return Response.json({
      success: true,
      crm_task_id: result.id,
      message: 'Task created in HubSpot'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}