import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { transactionId } = body;

    if (!transactionId) {
      return Response.json({ error: 'transactionId required' }, { status: 400 });
    }

    // Fetch transaction and related data
    const transaction = await base44.entities.Transaction.get(transactionId);
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Fetch contact info for borrower
    const contact = transaction.buyer_id ? await base44.entities.Contact.get(transaction.buyer_id) : null;

    // Fetch property details
    const property = transaction.property_id ? await base44.entities.Property.get(transaction.property_id) : null;

    // Prepare borrower data for AI analysis
    const borrowerData = {
      loan_amount: transaction.loan_amount,
      property_value: property?.price || 0,
      loan_type: transaction.loan_type,
      down_payment_percentage: transaction.down_payment_percent,
      credit_score: contact?.credit_score || 'Not provided',
      employment_status: contact?.employment_status || 'Not provided',
      annual_income: contact?.annual_income || 'Not provided',
      debt_to_income_ratio: contact?.debt_to_income_ratio,
      employment_history: contact?.employment_history || 'Not provided',
      savings_reserves: contact?.savings_reserves,
      co_borrower: transaction.co_borrower_name || 'None'
    };

    // Use AI to analyze eligibility
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze loan eligibility based on the following borrower profile:

Loan Amount: $${borrowerData.loan_amount}
Property Value: $${borrowerData.property_value}
Loan Type: ${borrowerData.loan_type}
Down Payment: ${borrowerData.down_payment_percentage}%
Credit Score: ${borrowerData.credit_score}
Employment Status: ${borrowerData.employment_status}
Annual Income: $${borrowerData.annual_income}
Debt-to-Income Ratio: ${borrowerData.debt_to_income_ratio || 'Not provided'}
Employment History: ${borrowerData.employment_history}
Savings/Reserves: $${borrowerData.savings_reserves || 'Not provided'}
Co-Borrower: ${borrowerData.co_borrower}

Provide a structured assessment including:
1. Overall eligibility status (Excellent/Good/Fair/At Risk/Ineligible)
2. Key strengths (3-4 points)
3. Risk factors (if any)
4. Recommended loan conditions (if any)
5. Likelihood of approval (percentage)
6. Key documentation needed to proceed`,
      response_json_schema: {
        type: 'object',
        properties: {
          eligibility_status: {
            type: 'string',
            enum: ['Excellent', 'Good', 'Fair', 'At Risk', 'Ineligible']
          },
          approval_likelihood: {
            type: 'number',
            description: 'Estimated approval likelihood 0-100'
          },
          strengths: {
            type: 'array',
            items: { type: 'string' }
          },
          risk_factors: {
            type: 'array',
            items: { type: 'string' }
          },
          recommended_conditions: {
            type: 'array',
            items: { type: 'string' }
          },
          required_documents: {
            type: 'array',
            items: { type: 'string' }
          },
          summary: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      transactionId,
      borrowerName: contact?.buyer_name || 'Unknown',
      analysis,
      assessedAt: new Date().toISOString(),
      assessedBy: user.email
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});