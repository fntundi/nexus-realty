import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { question, transactionId, borrowerEmail } = body;

    if (!question || !transactionId) {
      return Response.json({ error: 'question and transactionId required' }, { status: 400 });
    }

    // Fetch transaction details for context
    const transaction = await base44.entities.Transaction.get(transactionId);
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Fetch documents for this transaction
    const documents = await base44.entities.Document.filter({ transaction_id: transactionId });
    const pendingDocs = documents.filter(d => d.status === 'pending');
    const receivedDocs = documents.filter(d => d.status === 'received');

    // Prepare context for AI
    const loanContext = {
      loan_amount: transaction.loan_amount,
      property_price: transaction.property_price,
      loan_type: transaction.loan_type || 'Conventional',
      down_payment_percent: transaction.down_payment_percent,
      status: transaction.status,
      closing_date: transaction.closing_date,
      documents_pending: pendingDocs.length,
      documents_received: receivedDocs.length,
      pending_document_types: pendingDocs.map(d => d.document_type),
      received_document_types: receivedDocs.map(d => d.document_type)
    };

    // Use AI to answer borrower's question with full context
    const answer = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful loan assistant for a real estate lending company. A borrower has asked you a question about their loan application.

BORROWER'S QUESTION: "${question}"

LOAN APPLICATION CONTEXT:
- Loan Amount: $${loanContext.loan_amount}
- Property Price: $${loanContext.property_price}
- Loan Type: ${loanContext.loan_type}
- Down Payment: ${loanContext.down_payment_percent}%
- Current Status: ${loanContext.status}
- Expected Closing: ${loanContext.closing_date || 'To be determined'}
- Documents Received: ${loanContext.documents_received} documents
- Documents Pending: ${loanContext.documents_pending} documents
- Pending Documents: ${loanContext.pending_document_types.join(', ') || 'None'}
- Received Documents: ${loanContext.received_document_types.join(', ') || 'None'}

IMPORTANT GUIDELINES:
1. Be helpful, clear, and professional
2. Provide specific information from the loan context when relevant
3. If the borrower asks about something outside the loan process, politely redirect to loan-related topics
4. For questions about timelines, give realistic estimates (typically 15-30 days for loan approval)
5. Always encourage borrowers to upload missing documents as soon as possible
6. Be empathetic and supportive
7. Keep answers concise (2-3 sentences max, unless more detail is needed)
8. If you don't have the information, suggest contacting their lender directly

COMMON QUESTION TYPES:
- Loan Status: Answer based on the "status" field (e.g., "Your application is under review")
- Documents Needed: List pending documents and encourage upload
- Timeline/Closing: Reference the closing date or give typical timeline
- Process: Explain next steps in the loan process
- General Info: Answer loan-related questions based on best practices

Provide a helpful, empathetic response to the borrower's question.`,
      add_context_from_internet: false
    });

    return Response.json({
      success: true,
      question,
      answer,
      respondedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});