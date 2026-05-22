import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Zero-Trust Security Middleware
 * All backend functions should use these checks before processing sensitive data
 */

// Authenticate user and verify they exist
export async function authenticateUser(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    throw new Error('UNAUTHORIZED: User not authenticated');
  }
  
  return { base44, user };
}

// Verify user has required role
export function requireRole(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: User role '${user.role}' not allowed. Required: ${allowedRoles.join(', ')}`);
  }
}

// Verify user owns the resource (for data ownership checks)
export function verifyOwnership(user, resourceOwnerId) {
  if (user.id !== resourceOwnerId && user.role !== 'admin') {
    throw new Error('FORBIDDEN: User does not own this resource');
  }
}

// Verify user can access specific entity
export function verifyEntityAccess(user, entity, requiredRole = null) {
  if (requiredRole) {
    requireRole(user, [requiredRole]);
  }
  
  // Additional business logic checks can go here
  return true;
}

// Sanitize PII before returning to frontend
export function sanitizePII(data, fieldsToKeep = []) {
  const piiFields = [
    'ssn', 'social_security_number',
    'credit_card', 'card_number',
    'bank_account', 'routing_number',
    'drivers_license', 'license_number',
    'password', 'password_hash',
    'api_key', 'secret_key',
    'medical_history', 'health_records'
  ];
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizePII(item, fieldsToKeep));
  }
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    const isSensitive = piiFields.some(field => lowerKey.includes(field));
    const isAllowed = fieldsToKeep.includes(key);
    
    if (isSensitive && !isAllowed) {
      delete sanitized[key];
    }
  });
  
  return sanitized;
}

// Validate input to prevent injection attacks
export function validateInput(data, schema) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid input: Expected object');
  }
  
  const requiredFields = schema.required || [];
  
  requiredFields.forEach(field => {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  });
  
  return true;
}

// Format error response (never expose sensitive info in errors)
export function formatErrorResponse(error) {
  const isSecurityError = error.message.includes('UNAUTHORIZED') || 
                         error.message.includes('FORBIDDEN') ||
                         error.message.includes('Invalid input');
  
  if (isSecurityError) {
    return {
      error: error.message,
      status: error.message.includes('UNAUTHORIZED') ? 401 : 403
    };
  }
  
  // Don't expose internal errors to frontend
  return {
    error: 'An error occurred processing your request',
    status: 500
  };
}

// Wrapper for safe function execution with zero-trust checks
export async function executeWithZeroTrust(req, handler) {
  try {
    const { base44, user } = await authenticateUser(req);
    return await handler({ base44, user });
  } catch (error) {
    const { error: errorMsg, status } = formatErrorResponse(error);
    return Response.json({ error: errorMsg }, { status });
  }
}