import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Audit Logging for Security & Compliance
 * Log all sensitive operations for compliance and breach detection
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

// Sanitize data for audit logs (remove passwords, keys, etc)
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

/**
 * Main audit log function
 * @param {Object} logData - { type, userId, userEmail, action, resource, resourceId, details, status, ipAddress, timestamp }
 */
export async function logAuditEvent(logData) {
  try {
    const auditEntry = {
      log_type: logData.type,
      user_email: logData.userEmail,
      user_id: logData.userId,
      action: logData.action,
      resource: logData.resource,
      resource_id: logData.resourceId,
      details: sanitizeForLog(logData.details),
      status: logData.status || 'success',
      ip_address: logData.ipAddress,
      timestamp: new Date().toISOString(),
      severity: getSeverity(logData.type, logData.status)
    };
    
    // Write to AuditLog entity for compliance
    try {
      const base44 = createClientFromRequest({ headers: new Headers() });
      await base44.asServiceRole.entities.AuditLog.create(auditEntry);
    } catch (error) {
      // Fallback to console if entity write fails
      console.log('[AUDIT]', JSON.stringify(auditEntry));
    }
    
    return auditEntry;
  } catch (error) {
    console.error('[AUDIT_ERROR]', error.message);
  }
}

// Determine severity level
function getSeverity(logType, status) {
  if (status === 'failed' || logType === 'unauthorized_attempt') return 'high';
  if (logType === 'pii_access' || logType === 'data_modification') return 'medium';
  return 'low';
}

/**
 * Log data access (PII reads, sensitive queries)
 */
export async function logDataAccess(req, { resource, resourceId, fieldAccessed, foundPII }) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    await logAuditEvent({
      type: foundPII ? LOG_TYPES.PII_ACCESS : LOG_TYPES.DATA_ACCESS,
      userId: user?.id,
      userEmail: user?.email,
      action: 'read',
      resource,
      resourceId,
      details: { fieldAccessed, foundPII },
      status: 'success',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

/**
 * Log data modifications (creates, updates, deletes)
 */
export async function logDataModification(req, { action, resource, resourceId, changes }) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    await logAuditEvent({
      type: LOG_TYPES.DATA_MODIFICATION,
      userId: user?.id,
      userEmail: user?.email,
      action,
      resource,
      resourceId,
      details: { changes: sanitizeForLog(changes) },
      status: 'success',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

/**
 * Log file access/downloads
 */
export async function logFileAccess(req, { fileName, fileSize, accessType }) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    await logAuditEvent({
      type: LOG_TYPES.FILE_ACCESS,
      userId: user?.id,
      userEmail: user?.email,
      action: accessType || 'download',
      resource: 'file',
      resourceId: fileName,
      details: { fileName, fileSize },
      status: 'success',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

/**
 * Log failed authentication attempts
 */
export async function logFailedAuth(req, { reason, email }) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    
    await logAuditEvent({
      type: LOG_TYPES.FAILED_AUTH,
      userEmail: email || 'unknown',
      action: 'failed_login',
      resource: 'authentication',
      details: { reason },
      status: 'failed',
      ipAddress
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

/**
 * Log unauthorized access attempts
 */
export async function logUnauthorizedAttempt(req, { resource, action, reason }) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    await logAuditEvent({
      type: LOG_TYPES.UNAUTHORIZED_ATTEMPT,
      userId: user?.id,
      userEmail: user?.email,
      action,
      resource,
      details: { reason },
      status: 'failed',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });
  } catch (error) {
    console.error('[LOG_ERROR]', error.message);
  }
}

export { LOG_TYPES };