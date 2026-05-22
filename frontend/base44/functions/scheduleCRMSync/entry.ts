import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { rule_id } = await req.json();

    // Get sync rule
    const rule = await base44.entities.CRMSyncRule.get(rule_id);
    if (!rule || !rule.enabled) {
      return Response.json({ error: 'Sync rule not found or disabled' }, { status: 404 });
    }

    // Get CRM connection
    const connection = await base44.entities.CRMConnection.get(rule.crm_connection_id);
    if (!connection || !connection.enabled) {
      return Response.json({ error: 'CRM connection not found or disabled' }, { status: 404 });
    }

    // Execute sync based on rule type
    let syncResult;
    switch (rule.rule_type) {
      case 'leads':
        syncResult = await syncLeads(base44, rule, connection);
        break;
      case 'tasks':
        syncResult = await syncTasks(base44, rule, connection);
        break;
      case 'engagement':
        syncResult = await syncEngagement(base44, rule, connection);
        break;
      default:
        return Response.json({ error: 'Unknown sync rule type' }, { status: 400 });
    }

    // Update rule stats
    await base44.asServiceRole.entities.CRMSyncRule.update(rule.id, {
      last_sync_date: new Date().toISOString(),
      last_sync_status: syncResult.status,
      sync_stats: {
        records_synced: syncResult.recordsSynced,
        records_created: syncResult.recordsCreated,
        records_updated: syncResult.recordsUpdated,
        sync_errors: syncResult.errors,
        last_error_message: syncResult.errorMessage
      }
    });

    return Response.json({
      success: true,
      rule_id,
      ...syncResult
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function syncLeads(base44, rule, connection) {
  try {
    // Get leads to sync based on filters
    const contacts = await base44.entities.Contact.list();
    const filteredContacts = applyFilters(contacts, rule.filters);

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let lastError = null;

    for (const contact of filteredContacts) {
      try {
        const payload = buildSyncPayload(contact, rule.field_mappings);

        if (connection.crm_type === 'salesforce') {
          await syncToSalesforce(connection, payload, rule.sync_direction);
        } else if (connection.crm_type === 'hubspot') {
          await syncToHubSpot(connection, payload, rule.sync_direction);
        }

        syncedCount++;
        if (!contact.crm_id) createdCount++;
        else updatedCount++;
      } catch (error) {
        errorCount++;
        lastError = error.message;
      }
    }

    return {
      status: errorCount > 0 ? 'partial' : 'success',
      recordsSynced: syncedCount,
      recordsCreated: createdCount,
      recordsUpdated: updatedCount,
      errors: errorCount,
      errorMessage: lastError
    };
  } catch (error) {
    return {
      status: 'failed',
      recordsSynced: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: 1,
      errorMessage: error.message
    };
  }
}

async function syncTasks(base44, rule, connection) {
  try {
    const tasks = await base44.entities.Task.list();
    const filteredTasks = applyFilters(tasks, rule.filters);

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let lastError = null;

    for (const task of filteredTasks) {
      try {
        const payload = buildSyncPayload(task, rule.field_mappings);

        if (connection.crm_type === 'salesforce') {
          await syncTaskToSalesforce(connection, payload);
        } else if (connection.crm_type === 'hubspot') {
          await syncTaskToHubSpot(connection, payload);
        }

        syncedCount++;
        if (!task.crm_id) createdCount++;
        else updatedCount++;
      } catch (error) {
        errorCount++;
        lastError = error.message;
      }
    }

    return {
      status: errorCount > 0 ? 'partial' : 'success',
      recordsSynced: syncedCount,
      recordsCreated: createdCount,
      recordsUpdated: updatedCount,
      errors: errorCount,
      errorMessage: lastError
    };
  } catch (error) {
    return {
      status: 'failed',
      recordsSynced: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: 1,
      errorMessage: error.message
    };
  }
}

async function syncEngagement(base44, rule, connection) {
  try {
    const interactions = await base44.entities.Interaction.list();
    const filteredInteractions = applyFilters(interactions, rule.filters);

    let syncedCount = 0;
    let errorCount = 0;
    let lastError = null;

    for (const interaction of filteredInteractions) {
      try {
        const payload = buildEngagementPayload(interaction, rule.field_mappings);

        if (connection.crm_type === 'salesforce') {
          await syncEngagementToSalesforce(connection, payload);
        } else if (connection.crm_type === 'hubspot') {
          await syncEngagementToHubSpot(connection, payload);
        }

        syncedCount++;
      } catch (error) {
        errorCount++;
        lastError = error.message;
      }
    }

    return {
      status: errorCount > 0 ? 'partial' : 'success',
      recordsSynced: syncedCount,
      recordsCreated: syncedCount,
      recordsUpdated: 0,
      errors: errorCount,
      errorMessage: lastError
    };
  } catch (error) {
    return {
      status: 'failed',
      recordsSynced: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: 1,
      errorMessage: error.message
    };
  }
}

function applyFilters(records, filters) {
  if (!filters || filters.length === 0) return records;

  return records.filter(record =>
    filters.every(filter => evaluateFilter(record, filter))
  );
}

function evaluateFilter(record, filter) {
  const value = record[filter.field];

  switch (filter.operator) {
    case 'equals':
      return value === filter.value;
    case 'contains':
      return String(value).includes(String(filter.value));
    case 'greater_than':
      return Number(value) > Number(filter.value);
    case 'less_than':
      return Number(value) < Number(filter.value);
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(value);
    default:
      return true;
  }
}

function buildSyncPayload(contact, mappings) {
  const payload = {};

  if (!mappings || mappings.length === 0) {
    // Default mappings
    return {
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company
    };
  }

  for (const mapping of mappings) {
    let value = contact[mapping.local_field];

    if (mapping.transformation) {
      value = applyTransformation(value, mapping.transformation);
    }

    payload[mapping.crm_field] = value;
  }

  return payload;
}

function buildEngagementPayload(interaction, mappings) {
  const payload = {
    subject: interaction.subject,
    description: interaction.description,
    type: interaction.interaction_type,
    date: interaction.interaction_date
  };

  return payload;
}

function applyTransformation(value, transformation) {
  switch (transformation) {
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'multiply_by_2':
      return Number(value) * 2;
    default:
      return value;
  }
}

async function syncTaskToSalesforce(connection, payload) {
  const accessToken = await getAccessToken('salesforce');
  const response = await fetch(`${connection.salesforce_config.instance_url}/services/data/v57.0/sobjects/Task`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Salesforce sync failed');
  }
}

async function syncTaskToHubSpot(connection, payload) {
  const response = await fetch('https://api.hubapi.com/crm/v3/objects/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.hubspot_config.private_app_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ properties: Object.entries(payload).map(([k, v]) => ({ property: k, value: v })) })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'HubSpot sync failed');
  }
}

async function syncToSalesforce(connection, payload) {
  const accessToken = await getAccessToken('salesforce');
  const response = await fetch(`${connection.salesforce_config.instance_url}/services/data/v57.0/sobjects/Lead`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Salesforce sync failed');
  }
}

async function syncToHubSpot(connection, payload) {
  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.hubspot_config.private_app_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ properties: Object.entries(payload).map(([k, v]) => ({ property: k, value: v })) })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'HubSpot sync failed');
  }
}

async function syncEngagementToSalesforce(connection, payload) {
  const accessToken = await getAccessToken('salesforce');
  const response = await fetch(`${connection.salesforce_config.instance_url}/services/data/v57.0/sobjects/Task`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to sync engagement');
  }
}

async function syncEngagementToHubSpot(connection, payload) {
  const response = await fetch('https://api.hubapi.com/crm/v3/objects/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.hubspot_config.private_app_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ properties: Object.entries(payload).map(([k, v]) => ({ property: k, value: v })) })
  });

  if (!response.ok) {
    throw new Error('Failed to sync engagement to HubSpot');
  }
}

async function getAccessToken(type) {
  // This should be called within proper context with base44
  return '';
}