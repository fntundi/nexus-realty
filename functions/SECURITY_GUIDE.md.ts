# Zero-Trust Security Implementation Guide

## Overview
This guide documents the security architecture implemented for the Nexus Real Estate platform. All code follows a zero-trust model where every request is authenticated, authorized, and logged.

---

## Core Security Components

### 1. **Security Middleware** (`securityMiddleware.js`)
Provides authentication, authorization, and data sanitization utilities.

**Key Functions:**
- `authenticateUser(req)` - Verify user is authenticated
- `requireRole(user, allowedRoles)` - Enforce role-based access control
- `verifyOwnership(user, resourceOwnerId)` - Verify user owns resource
- `sanitizePII(data, fieldsToKeep)` - Remove sensitive fields before sending to frontend
- `validateInput(data, schema)` - Prevent injection attacks
- `executeWithZeroTrust(req, handler)` - Wrapper that enforces auth on all requests

**Usage Example:**
```javascript
export async function myFunction(req) {
  return executeWithZeroTrust(req, async ({ base44, user }) => {
    // User is authenticated here
    const data = await base44.entities.Contact.list();
    return Response.json(data);
  });
}
```

### 2. **Audit Logging** (`auditLogger.js`)
Logs all sensitive operations for compliance and breach detection.

**Key Functions:**
- `logDataAccess(req, { resource, resourceId, fieldAccessed, foundPII })`
- `logDataModification(req, { action, resource, resourceId, changes })`
- `logFileAccess(req, { fileName, fileSize, accessType })`
- `logFailedAuth(req, { reason, email })`
- `logUnauthorizedAttempt(req, { resource, action, reason })`

### 3. **Secure File Handler** (`secureFileHandler.js`)
Handles PII documents with encryption and access control.

**Key Functions:**
- `uploadSensitiveFile(req)` - Upload to private encrypted storage
- `generateSecureFileUrl(req)` - Create time-limited download link (5 min default)
- `getFileMetadata(req)` - Get file info without exposing content

---

## Security Patterns

### Pattern 1: Secure Entity Access
```javascript
const contact = await base44.entities.Contact.get(contactId);
verifyOwnership(user, contact.created_by);
await logDataAccess(req, { resource: 'Contact', resourceId: contactId, foundPII: true });
const safe = sanitizePII(contact, ['email', 'phone']);
return Response.json(safe);
```

### Pattern 2: Protected Updates
```javascript
const protectedFields = ['created_by', 'ssn'];
if (protectedFields.some(f => f in updates) && user.role !== 'admin') {
  await logUnauthorizedAttempt(req, { resource: 'Contact', reason: 'Protected field update' });
  return Response.json({ error: 'Cannot modify field' }, { status: 403 });
}
```

### Pattern 3: Role-Based Filtering
```javascript
const safe = user.role === 'admin' 
  ? data 
  : sanitizePII(data, ['name', 'email', 'phone']);
return Response.json(safe);
```

### Pattern 4: PII File Storage
```javascript
// ❌ WRONG: const entity = { ssn_copy: 'base64...' };
// ✅ RIGHT:
const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
const metadata = { file_uri, file_type: 'id', uploaded_by_email: user.email };
```

---

## Entities

### AuditLog
Stores all sensitive operations (data access, modifications, auth failures, unauthorized attempts).

### FileMetadata
Stores metadata for sensitive files (tracks access, classification, retention).

---

## Compliance

**Keep audit logs for 7 years** (GDPR, CCPA, HIPAA requirement).

Use AuditLog for:
- Compliance reporting
- Breach investigation
- Access pattern analysis
- Anomaly detection

---

## Implementation Checklist

- [x] Authentication on all sensitive endpoints
- [x] PII sanitization before frontend exposure
- [x] Audit logging for access/modifications
- [x] Secure encrypted file storage
- [x] Role-based access control
- [x] Protected field modification prevention
- [x] Input validation

**Next:** Apply these patterns to all backend functions touching sensitive data.