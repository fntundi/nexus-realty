import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { logFileAccess } from './auditLogger.js';
import { executeWithZeroTrust, sanitizePII } from './securityMiddleware.js';

/**
 * Secure File Handler for PII and Sensitive Documents
 * Handles encrypted storage, access control, and audit logging
 */

/**
 * Upload sensitive file (PII, documents, etc)
 * Returns file_uri (for secure storage) instead of direct URL
 * Use this for: ID copies, financial docs, SSNs, health records, etc
 */
export async function uploadSensitiveFile(req) {
  return executeWithZeroTrust(req, async ({ base44, user }) => {
    try {
      const formData = await req.formData();
      const file = formData.get('file');
      const fileType = formData.get('fileType'); // 'id', 'financial', 'legal', etc
      const relatedEntityId = formData.get('relatedEntityId'); // contact_id, transaction_id, etc
      
      if (!file) {
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }
      
      // Validate file type for security
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        return Response.json({ error: 'File type not allowed' }, { status: 400 });
      }
      
      // Limit file size (10MB for sensitive docs)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return Response.json({ error: 'File too large' }, { status: 400 });
      }
      
      // Upload to private storage (encrypted at rest)
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      
      // Audit log the upload
      await logFileAccess(req, {
        fileName: file.name,
        fileSize: file.size,
        accessType: 'upload'
      });
      
      return Response.json({
        success: true,
        file_uri, // Store this, not the file itself
        fileName: file.name,
        uploadedBy: user.email,
        uploadedAt: new Date().toISOString(),
        fileType,
        relatedEntityId
      });
      
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  });
}

/**
 * Generate secure, time-limited download URL for sensitive file
 * Should only be called after verifying user has access to the resource
 */
export async function generateSecureFileUrl(req) {
  return executeWithZeroTrust(req, async ({ base44, user }) => {
    try {
      const body = await req.json();
      const { file_uri, expiresInSeconds = 300 } = body; // Default 5 min expiry
      
      if (!file_uri) {
        return Response.json({ error: 'file_uri required' }, { status: 400 });
      }
      
      // Generate signed URL with expiration
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri,
        expires_in: expiresInSeconds
      });
      
      // Audit log the access
      await logFileAccess(req, {
        fileName: file_uri,
        accessType: 'download_request'
      });
      
      return Response.json({
        success: true,
        signed_url,
        expiresInSeconds,
        downloadedBy: user.email
      });
      
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  });
}

/**
 * Get file metadata without exposing the file itself
 * Returns only: fileName, fileSize, fileType, uploadedBy, uploadedAt
 */
export async function getFileMetadata(req) {
  return executeWithZeroTrust(req, async ({ base44, user }) => {
    try {
      const body = await req.json();
      const { file_uri } = body;
      
      if (!file_uri) {
        return Response.json({ error: 'file_uri required' }, { status: 400 });
      }
      
      // In real implementation, fetch metadata from a FileMetadata entity
      // For now, return safe metadata structure
      return Response.json({
        file_uri,
        fileName: 'document.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        uploadedBy: 'user@example.com',
        uploadedAt: new Date().toISOString(),
        accessCount: 0,
        lastAccessedAt: null
      });
      
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  });
}

export { uploadSensitiveFile, generateSecureFileUrl, getFileMetadata };