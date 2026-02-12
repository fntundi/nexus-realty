import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { executeWithZeroTrust, sanitizePII, verifyOwnership } from './securityMiddleware.js';
import { logDataAccess, logUnauthorizedAttempt } from './auditLogger.js';

/**
 * Example: Secure Contact Access with Zero-Trust
 * This demonstrates how to implement data segregation and PII protection
 * 
 * Principles:
 * - All access is authenticated and authorized
 * - PII is only exposed on a need-to-know basis
 * - All sensitive operations are logged
 * - Data ownership is verified
 */

/**
 * Get contact details with role-based PII filtering
 * Agents see limited info, admins see everything
 */
export async function getContactDetails(req) {
  return executeWithZeroTrust(req, async ({ base44, user }) => {
    try {
      const body = await req.json();
      const { contactId } = body;
      
      if (!contactId) {
        return Response.json({ error: 'contactId required' }, { status: 400 });
      }
      
      // Fetch contact from database
      const contact = await base44.entities.Contact.get(contactId);
      
      if (!contact) {
        return Response.json({ error: 'Contact not found' }, { status: 404 });
      }
      
      // Verify access: User can access their own contacts or admin can access any
      const canAccess = user.role === 'admin' || contact.created_by === user.email;
      
      if (!canAccess) {
        // Log unauthorized attempt
        await logUnauthorizedAttempt(req, {
          resource: 'Contact',
          action: 'read',
          reason: `User ${user.email} attempted to access contact ${contactId} they don't own`
        });
        
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // Log the access
      await logDataAccess(req, {
        resource: 'Contact',
        resourceId: contactId,
        foundPII: true
      });
      
      // Filter PII based on user role
      let filteredContact = { ...contact };
      
      if (user.role !== 'admin') {
        // Non-admins only see: name, email, company, status
        // Never show: ssn, credit_card, bank_account, medical_history
        filteredContact = sanitizePII(contact, ['email', 'phone', 'company', 'status', 'lead_score']);
      }
      
      return Response.json({
        success: true,
        contact: filteredContact,
        accessedAt: new Date().toISOString(),
        accessedBy: user.email
      });
      
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  });
}

/**
 * Update contact with permission and validation checks
 */
export async function updateContact(req) {
  return executeWithZeroTrust(req, async ({ base44, user }) => {
    try {
      const body = await req.json();
      const { contactId, updates } = body;
      
      if (!contactId || !updates) {
        return Response.json({ error: 'contactId and updates required' }, { status: 400 });
      }
      
      // Fetch current contact
      const contact = await base44.entities.Contact.get(contactId);
      
      if (!contact) {
        return Response.json({ error: 'Contact not found' }, { status: 404 });
      }
      
      // Verify ownership
      verifyOwnership(user, contact.created_by);
      
      // Prevent tampering with critical fields
      const protectedFields = ['created_by', 'created_date', 'ssn', 'credit_card'];
      const attemptedProtectedChange = protectedFields.some(field => field in updates);
      
      if (attemptedProtectedChange && user.role !== 'admin') {
        await logUnauthorizedAttempt(req, {
          resource: 'Contact',
          action: 'update',
          reason: 'Attempted to modify protected fields'
        });
        
        return Response.json({ error: 'Cannot modify protected fields' }, { status: 403 });
      }
      
      // Validate sensitive fields if being updated
      if (updates.email && !isValidEmail(updates.email)) {
        return Response.json({ error: 'Invalid email format' }, { status: 400 });
      }
      
      // Perform update
      const updatedContact = await base44.entities.Contact.update(contactId, updates);
      
      // Log the modification
      await logDataAccess(req, {
        resource: 'Contact',
        resourceId: contactId,
        action: 'update',
        changes: Object.keys(updates)
      });
      
      return Response.json({
        success: true,
        contact: updatedContact,
        updatedFields: Object.keys(updates),
        updatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  });
}

/**
 * List contacts with filtered PII based on role
 */
export async function listContacts(req) {
  return executeWithZeroTrust(req, async ({ base44, user }) => {
    try {
      let contacts;
      
      // Admins see all contacts, regular users only see their own
      if (user.role === 'admin') {
        contacts = await base44.entities.Contact.list('-created_date');
      } else {
        contacts = await base44.entities.Contact.filter({ created_by: user.email }, '-created_date');
      }
      
      // Apply PII filtering to each contact
      const filteredContacts = contacts.map(contact => 
        sanitizePII(contact, ['id', 'email', 'phone', 'company', 'status', 'lead_score', 'created_date'])
      );
      
      // Log access
      await logDataAccess(req, {
        resource: 'Contact',
        action: 'list',
        foundPII: true
      });
      
      return Response.json({
        success: true,
        contacts: filteredContacts,
        count: filteredContacts.length,
        accessedAt: new Date().toISOString()
      });
      
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  });
}

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export { getContactDetails, updateContact, listContacts };