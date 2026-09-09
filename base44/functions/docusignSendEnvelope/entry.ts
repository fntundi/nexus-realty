import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { loadAuthorizedDocument } from '../../shared/security.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if DocuSign is enabled
    const configs = await base44.entities.AppConfig.filter({ config_key: 'docusign_settings' });
    const docusignConfig = configs[0]?.config_value || {};
    
    if (!docusignConfig.enabled) {
      return Response.json({ 
        error: 'DocuSign integration is not enabled. Please enable it in settings.' 
      }, { status: 400 });
    }

    // Check required secrets
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const userId = Deno.env.get('DOCUSIGN_USER_ID');
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const privateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');
    const basePath = Deno.env.get('DOCUSIGN_BASE_PATH');

    if (!integrationKey || !userId || !accountId || !privateKey || !basePath) {
      return Response.json({ 
        error: 'DocuSign is not configured. Please set the required environment variables: DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_PRIVATE_KEY, DOCUSIGN_BASE_PATH' 
      }, { status: 400 });
    }

    const { document_id, document_url, file_name, signers, message, due_date } = await req.json();

    if (!document_id || !document_url || !Array.isArray(signers) || signers.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // IDOR protection: only an admin, the uploader, or a transaction participant
    // may create a signature request for this document
    const authDoc = await loadAuthorizedDocument(base44, user, document_id);
    if (authDoc.error) return authDoc.error;

    // SSRF protection: only fetch https URLs pointing at public hosts
    if (!isValidPublicHttpsUrl(document_url)) {
      return Response.json({ error: 'Invalid document URL' }, { status: 400 });
    }

    // Get JWT access token
    const authResponse = await fetch(`${basePath.replace('/restapi', '')}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await generateJWT(integrationKey, userId, privateKey, basePath)
      })
    });

    if (!authResponse.ok) {
      console.error('DocuSign auth failed:', await authResponse.text());
      return Response.json({ error: 'DocuSign authentication failed' }, { status: 500 });
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Fetch document from URL (host already validated against SSRF above)
    const docResponse = await fetch(document_url);
    if (!docResponse.ok) {
      return Response.json({ error: 'Could not download the document file' }, { status: 400 });
    }
    const docBlob = await docResponse.blob();
    const docBase64 = await blobToBase64(docBlob);

    // Create envelope
    const envelope = {
      emailSubject: `Please sign: ${file_name}`,
      emailBlurb: message || 'Please review and sign this document.',
      documents: [{
        documentBase64: docBase64,
        name: file_name,
        fileExtension: file_name.split('.').pop(),
        documentId: '1'
      }],
      recipients: {
        signers: signers.map((signer, idx) => ({
          email: signer.email,
          name: signer.name,
          recipientId: String(idx + 1),
          routingOrder: String(signer.order || idx + 1)
        }))
      },
      status: 'sent'
    };

    if (due_date) {
      envelope.notification = {
        useAccountDefaults: false,
        reminders: {
          reminderEnabled: true,
          reminderDelay: '2',
          reminderFrequency: '2'
        },
        expirations: {
          expireEnabled: true,
          expireAfter: '30',
          expireWarn: '2'
        }
      };
    }

    // Send envelope
    const envelopeResponse = await fetch(
      `${basePath}/v2.1/accounts/${accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envelope)
      }
    );

    if (!envelopeResponse.ok) {
      console.error('DocuSign envelope creation failed:', await envelopeResponse.text());
      return Response.json({ error: 'Failed to create DocuSign envelope' }, { status: 500 });
    }

    const envelopeData = await envelopeResponse.json();

    // Update document with signature request info
    await base44.asServiceRole.entities.Document.update(document_id, {
      status: 'awaiting_signatures',
      signature_request: {
        docusign_envelope_id: envelopeData.envelopeId,
        requested_by: user.email,
        requested_date: new Date().toISOString(),
        due_date: due_date,
        message: message,
        signers: signers.map((signer, idx) => ({
          ...signer,
          status: 'sent',
          docusign_recipient_id: String(idx + 1)
        }))
      }
    });

    return Response.json({
      success: true,
      envelope_id: envelopeData.envelopeId,
      envelope_uri: envelopeData.uri
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

async function generateJWT(integrationKey, userId, privateKey, basePath) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: basePath.includes('demo') ? 'account-d.docusign.com' : 'account.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation'
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
    encoder.encode(signatureInput)
  );

  const signatureB64 = base64UrlEncode(signature);
  return `${signatureInput}.${signatureB64}`;
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlEncode(input) {
  let b64;
  if (typeof input === 'string') {
    b64 = btoa(input);
  } else if (input instanceof ArrayBuffer) {
    const bytes = new Uint8Array(input);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    b64 = btoa(binary);
  } else {
    b64 = btoa(input);
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function blobToBase64(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * SSRF protection: only https URLs on public hosts are fetchable.
 * Rejects localhost, private/internal networks, and cloud metadata endpoints.
 */
function isValidPublicHttpsUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
      return false;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const [a, b] = host.split('.').map(Number);
      if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
          (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
        return false;
      }
    }
    if (host.includes(':')) {
      const h = host.replace(/^\[|\]$/g, '');
      if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}