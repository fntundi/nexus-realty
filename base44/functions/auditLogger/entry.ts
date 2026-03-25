import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Audit Logging for Security & Compliance
 * 
 * Used as both a callable endpoint AND imported utility by other functions.
 * POST payload: { type, action, resource, resourceId, details, status }
 */

const LOG_TYPES = {
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  FILE_ACCESS: 'file_access',
  FILE_UPLOAD: 'file_upload',
  ROLE_CHANGE: 'role_change',
  FAILED_AUTH: 'failed_auth',
  PII_ACCESS: 'pii_access',
  UNAUTHORIZED_ATTEMPT: 'unauthorized_attempt'
};

function sanitizeForLog(data) {
  if (typeof data !== 'object' || data === null) return data;
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'api_key', 'secret', 'token', 'ssn', 'credit_card'];
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  return sanitized;
}

function getSeverity(logType, status) {
  if (status === 'failed' || logType === 'unauthorized_attempt') return 'high';
  if (logType === 'pii_access' || logType === 'data_modification') return 'medium';
  return 'low';
}

/**
 * Core audit event logger — requires a real Request object for auth context.
 */
async function logAuditEvent(req, logData) {
  try {
    const base44 = createClientFromRequest(req);
    let userEmail = logData.userEmail;
    let userId = logData.userId;

    // Attempt to resolve user from request if not provided
    if (!userEmail) {
      try {
        const user = await base44.auth.me();
        userEmail = user?.email;
        userId = user?.id;
      } catch (_) { /* unauthenticated callers */ }
    }

    const auditEntry = {
      log_type: logData.type,
      user_email: userEmail,
      user_id: userId,
      action: logData.action,
      resource: logData.resource,
      resource_id: logData.resourceId,
      details: sanitizeForLog(logData.details),
      status: logData.status || 'success',
      ip_address: req.headers?.get?.('x-forwarded-for') || 'unknown',
      severity: getSeverity(logData.type, logData.status)
    };

    await base44.asServiceRole.entities.AuditLog.create(auditEntry);
    return auditEntry;
  } catch (error) {
    // Fallback — never let audit failure crash the caller
    console.log('[AUDIT]', JSON.stringify({ ...logData, error: error.message }));
  }
}

async function logDataAccess(req, { resource, resourceId, fieldAccessed, foundPII }) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    await logAuditEvent(req, {
      type: foundPII ? LOG_TYPES.PII_ACCESS : LOG_TYPES.DATA_ACCESS,
      userId: user?.id,
      userEmail: user?.email,
      action: 'read',
      resource,
      resourceId,
      details: { fieldAccessed, foundPII },
      status: 'success'
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

async function logDataModification(req, { action, resource, resourceId, changes }) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    await logAuditEvent(req, {
      type: LOG_TYPES.DATA_MODIFICATION,
      userId: user?.id,
      userEmail: user?.email,
      action,
      resource,
      resourceId,
      details: { changes: sanitizeForLog(changes) },
      status: 'success'
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

async function logFileAccess(req, { fileName, fileSize, accessType }) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    await logAuditEvent(req, {
      type: LOG_TYPES.FILE_ACCESS,
      userId: user?.id,
      userEmail: user?.email,
      action: accessType || 'download',
      resource: 'file',
      resourceId: fileName,
      details: { fileName, fileSize },
      status: 'success'
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

async function logFailedAuth(req, { reason, email }) {
  await logAuditEvent(req, {
    type: LOG_TYPES.FAILED_AUTH,
    userEmail: email || 'unknown',
    action: 'failed_login',
    resource: 'authentication',
    details: { reason },
    status: 'failed'
  });
}

async function logUnauthorizedAttempt(req, { resource, action, reason }) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    await logAuditEvent(req, {
      type: LOG_TYPES.UNAUTHORIZED_ATTEMPT,
      userId: user?.id,
      userEmail: user?.email,
      action,
      resource,
      details: { reason },
      status: 'failed'
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

// Export utilities for use by other functions
export {
  logAuditEvent,
  logDataAccess,
  logDataModification,
  logFileAccess,
  logFailedAuth,
  logUnauthorizedAttempt,
  LOG_TYPES
};

// Direct endpoint: POST { type, action, resource, resourceId, details, status }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'agent'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json();
    const entry = await logAuditEvent(req, {
      ...payload,
      userEmail: user.email,
      userId: user.id
    });

    return Response.json({ success: true, entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});