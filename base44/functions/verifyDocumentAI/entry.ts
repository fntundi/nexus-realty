import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, fileUrl, documentType, category } = await req.json();

    if (!documentId || !fileUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Define verification rules by document type
    const verificationRules = {
      identification: {
        requiredElements: ['name', 'date_of_birth', 'id_number', 'expiration_date'],
        checkExpiry: true,
        autoVerifyIfValid: true
      },
      income_proof: {
        requiredElements: ['income_amount', 'employer_name', 'pay_period', 'date_range'],
        checkExpiry: false,
        autoVerifyIfValid: true
      },
      bank_statement: {
        requiredElements: ['account_number', 'balance', 'transaction_history', 'statement_date'],
        checkExpiry: true,
        autoVerifyIfValid: false
      },
      property_appraisal: {
        requiredElements: ['property_address', 'appraised_value', 'appraiser_name', 'appraisal_date'],
        checkExpiry: true,
        autoVerifyIfValid: true
      },
      title_report: {
        requiredElements: ['property_address', 'title_status', 'liens', 'owner_info'],
        checkExpiry: false,
        autoVerifyIfValid: false
      }
    };

    const rules = verificationRules[documentType] || verificationRules['income_proof'];

    // Use AI to analyze the document
    const analysisPrompt = `
    You are a document verification expert. Analyze this document image/file and verify the following:
    
    Document Type: ${documentType}
    Required Elements: ${rules.requiredElements.join(', ')}
    Check Expiry: ${rules.checkExpiry}
    
    Please provide:
    1. A list of detected elements found in the document
    2. Whether all required elements are present
    3. If applicable, whether the document is expired
    4. Overall verification status: "pass", "warn", or "fail"
    5. Specific issues or concerns (if any)
    
    Respond in JSON format with keys: detected_elements, all_required_present, is_expired, verification_status, issues, confidence_score (0-100).
    `;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          detected_elements: { type: 'array', items: { type: 'string' } },
          all_required_present: { type: 'boolean' },
          is_expired: { type: 'boolean' },
          verification_status: { type: 'string', enum: ['pass', 'warn', 'fail'] },
          issues: { type: 'array', items: { type: 'string' } },
          confidence_score: { type: 'number' }
        }
      }
    });

    // Determine document status based on analysis
    let docStatus = 'pending_review';
    let verificationNotes = [];

    if (analysis.verification_status === 'fail' || analysis.is_expired) {
      docStatus = 'rejected';
      verificationNotes.push(`AI verification failed. Issues: ${analysis.issues?.join('; ') || 'Document validation failed'}`);
    } else if (analysis.verification_status === 'warn') {
      docStatus = 'pending_review';
      verificationNotes.push(`AI flagged concerns: ${analysis.issues?.join('; ') || 'Needs manual review'}`);
    } else if (analysis.verification_status === 'pass' && rules.autoVerifyIfValid && analysis.confidence_score > 85) {
      docStatus = 'approved';
      verificationNotes.push(`Auto-verified by AI with ${analysis.confidence_score}% confidence`);
    } else if (analysis.verification_status === 'pass') {
      docStatus = 'pending_review';
      verificationNotes.push(`AI analysis passed but requires manual verification (confidence: ${analysis.confidence_score}%)`);
    }

    // Update document with verification results
    const updatePayload = {
      status: docStatus,
      verification_status: docStatus,
      ai_verification_result: {
        analysis,
        verified_at: new Date().toISOString(),
        verified_by: 'ai_system'
      },
      notes: (verificationNotes || []).join(' | ')
    };

    await base44.entities.Document.update(documentId, updatePayload);

    return Response.json({
      success: true,
      document_id: documentId,
      status: docStatus,
      analysis,
      auto_verified: docStatus === 'approved',
      notes: verificationNotes
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});