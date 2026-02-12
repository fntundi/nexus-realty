import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'Missing document_id' }, { status: 400 });
    }

    // Get document
    const documents = await base44.entities.Document.filter({ id: document_id });
    const document = documents[0];

    if (!document || !document.signature_request?.docusign_envelope_id) {
      return Response.json({ error: 'Document not found or not sent for signature' }, { status: 404 });
    }

    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const userId = Deno.env.get('DOCUSIGN_USER_ID');
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const privateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');
    const basePath = Deno.env.get('DOCUSIGN_BASE_PATH');

    if (!integrationKey || !userId || !accountId || !privateKey || !basePath) {
      return Response.json({ error: 'DocuSign not configured' }, { status: 400 });
    }

    // Get JWT token (reuse the JWT function from sendEnvelope)
    const authResponse = await fetch(`${basePath.replace('/restapi', '')}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await generateJWT(integrationKey, userId, privateKey, basePath)
      })
    });

    if (!authResponse.ok) {
      return Response.json({ error: 'Authentication failed' }, { status: 500 });
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Get envelope status
    const envelopeId = document.signature_request.docusign_envelope_id;
    const statusResponse = await fetch(
      `${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!statusResponse.ok) {
      return Response.json({ error: 'Failed to fetch envelope status' }, { status: 500 });
    }

    const envelopeStatus = await statusResponse.json();

    return Response.json({
      success: true,
      status: envelopeStatus.status,
      created_date: envelopeStatus.createdDateTime,
      sent_date: envelopeStatus.sentDateTime,
      completed_date: envelopeStatus.completedDateTime,
      recipients: envelopeStatus.recipients
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});

// Helper function (same as in sendEnvelope)
async function generateJWT(integrationKey, userId, privateKey, basePath) {
  const header = { alg: 'RS256', typ: 'JWT' };
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
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
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