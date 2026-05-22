import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, fileUrl, fileName } = await req.json();

    if (!documentId || !fileUrl) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Use AI to analyze document content and categorize
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this document and determine its category. The document is named: "${fileName}".
      
Available categories:
- contract: Purchase agreements, sales contracts
- disclosure: Property disclosures, seller disclosures
- inspection: Home inspection reports, termite reports
- appraisal: Property appraisals, valuations
- loan: Loan documents, pre-approval letters, loan estimates
- insurance: Insurance documents, policies
- closing: Closing documents, settlement statements
- identification: Driver's licenses, passports, ID cards
- income_proof: Pay stubs, W-2s, tax returns, employment letters
- bank_statement: Bank statements, financial statements
- property_appraisal: Appraisal reports, valuation documents
- title_report: Title insurance, title reports
- other: Any other type of document

Based on the document content and filename, provide:
1. The most appropriate category from the list above
2. A confidence score (0-100)
3. A brief explanation of why this category was chosen
4. Alternative categories if confidence is low`,
      add_context_from_internet: false,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          category: { 
            type: "string",
            enum: ["contract", "disclosure", "inspection", "appraisal", "loan", "insurance", "closing", "identification", "income_proof", "bank_statement", "property_appraisal", "title_report", "other"]
          },
          confidence: { type: "number" },
          explanation: { type: "string" },
          alternative_categories: { 
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["category", "confidence", "explanation"]
      }
    });

    // Update document with categorization
    await base44.asServiceRole.entities.Document.update(documentId, {
      category: response.category,
      auto_categorized: true,
      categorization_confidence: response.confidence,
      notes: response.explanation
    });

    return Response.json({
      success: true,
      category: response.category,
      confidence: response.confidence,
      explanation: response.explanation,
      alternatives: response.alternative_categories || []
    });

  } catch (error) {
    console.error('Document categorization error:', error);
    return Response.json({ 
      error: 'Failed to categorize document',
      details: error.message 
    }, { status: 500 });
  }
});