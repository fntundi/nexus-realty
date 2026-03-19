import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { logAuditEvent } from './auditLogger.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify webhook signature for security
    const signature = req.headers.get('x-docusign-signature-1');
    const webhookSecret = Deno.env.get('DOCUSIGN_WEBHOOK_SECRET');
    
    if (!signature || !webhookSecret) {
      await logAuditEvent({
        type: 'unauthorized_attempt',
        action: 'webhook_call',
        resource: 'docusign_webhook',
        status: 'failed',
        details: { reason: 'Missing signature or secret' },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
      });
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // DocuSign sends XML webhooks
    const body = await req.text();
    
    // Verify HMAC signature
    const crypto = await import('node:crypto');
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(body);
    const expectedSignature = hmac.digest('base64');
    
    if (signature !== expectedSignature) {
      await logAuditEvent({
        type: 'unauthorized_attempt',
        action: 'webhook_call',
        resource: 'docusign_webhook',
        status: 'failed',
        details: { reason: 'Invalid signature' },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
      });
      return Response.json({ error: 'Invalid signature' }, { status: 403 });
    }
    
    // Parse the webhook data (DocuSign sends XML, you may need to parse it)
    // For now, we'll expect JSON format for simplicity
    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch {
      // If it's XML, you would parse it here
      return Response.json({ error: 'Invalid webhook format' }, { status: 400 });
    }

    const { envelopeId, status, recipients } = webhookData;

    if (!envelopeId) {
      return Response.json({ error: 'Missing envelope ID' }, { status: 400 });
    }

    // Find document with this envelope ID
    const documents = await base44.asServiceRole.entities.Document.filter({
      'signature_request.docusign_envelope_id': envelopeId
    });

    if (documents.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = documents[0];
    const signatureRequest = document.signature_request;

    // Update signer statuses
    if (recipients && recipients.signers) {
      recipients.signers.forEach(docusignSigner => {
        const signer = signatureRequest.signers.find(
          s => s.docusign_recipient_id === docusignSigner.recipientId
        );
        if (signer) {
          signer.status = docusignSigner.status.toLowerCase();
          if (docusignSigner.signedDateTime) {
            signer.signed_date = docusignSigner.signedDateTime;
          }
          if (docusignSigner.declinedReason) {
            signer.declined_reason = docusignSigner.declinedReason;
          }
        }
      });
    }

    // Update document status based on envelope status
    let documentStatus = document.status;
    if (status === 'completed') {
      documentStatus = 'fully_signed';
      signatureRequest.completion_date = new Date().toISOString();
      
      // Download signed document from DocuSign
      // This would require making an API call to DocuSign to get the signed document
      // For now, we'll just update the status
    } else if (status === 'declined') {
      documentStatus = 'rejected';
    } else if (status === 'voided') {
      documentStatus = 'rejected';
    } else {
      // Check if partially signed
      const signedCount = signatureRequest.signers.filter(s => s.status === 'signed').length;
      if (signedCount > 0 && signedCount < signatureRequest.signers.length) {
        documentStatus = 'partially_signed';
      }
    }

    // Update the document
    await base44.asServiceRole.entities.Document.update(document.id, {
      status: documentStatus,
      signature_request: signatureRequest
    });
    
    // Audit log for compliance
    await logAuditEvent({
      type: 'data_modification',
      action: 'update',
      resource: 'Document',
      resourceId: document.id,
      details: { 
        status: documentStatus, 
        envelopeId,
        webhook_source: 'docusign'
      },
      status: 'success',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    // Send notifications
    if (status === 'completed') {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: signatureRequest.requested_by,
        subject: `Document Fully Signed: ${document.file_name}`,
        body: `The document "${document.file_name}" has been signed by all parties.`
      });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});