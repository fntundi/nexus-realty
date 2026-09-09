/**
 * Shared security helpers for backend functions.
 */

/**
 * INTERNAL_SECRET verifies service-to-service calls (workflows / function-to-function),
 * letting internal endpoints reject all external unauthenticated requests.
 * Server-side only — never import from frontend code.
 */
export const INTERNAL_SECRET = "9f4c2e7a1d8b6035c2f9a4e17d3b8f6a0c5e2d9b7f4a1c8e6d3b0a9f7c4e2d15";

/**
 * Loads a transaction via service role only after verifying the caller is an
 * admin, the transaction's buyer, or its assigned agent (prevents IDOR).
 * Returns { transaction } on success, or { error: Response } when unauthorized/not found.
 */
export async function loadAuthorizedTransaction(base44, user, transactionId) {
  const transaction = await base44.asServiceRole.entities.Transaction.get(transactionId).catch(() => null);
  if (!transaction) {
    return { error: Response.json({ error: 'Transaction not found' }, { status: 404 }) };
  }
  if (user.role === 'admin' || transaction.buyer_email === user.email || transaction.lender_email === user.email) {
    return { transaction };
  }
  if (transaction.agent_id) {
    const agents = await base44.asServiceRole.entities.Agent.filter({ id: transaction.agent_id }).catch(() => []);
    if (agents[0]?.user_email === user.email) {
      return { transaction };
    }
  }
  return { error: Response.json({ error: 'Forbidden: You do not have access to this transaction' }, { status: 403 }) };
}

/**
 * Loads a document via service role only after verifying the caller is an
 * admin, the uploader, or a participant on the document's transaction/lead
 * (buyer / assigned agent / lender). Prevents IDOR on document mutations.
 * Returns { document } on success, or { error: Response } when unauthorized/not found.
 */
export async function loadAuthorizedDocument(base44, user, documentId) {
  const document = await base44.asServiceRole.entities.Document.get(documentId).catch(() => null);
  if (!document) {
    return { error: Response.json({ error: 'Document not found' }, { status: 404 }) };
  }
  if (user.role === 'admin') {
    return { document };
  }
  const uploader = (document.uploaded_by_email || document.uploaded_by || '').toLowerCase();
  if (uploader === (user.email || '').toLowerCase()) {
    return { document };
  }
  if (document.transaction_id) {
    const txnResult = await loadAuthorizedTransaction(base44, user, document.transaction_id);
    if (txnResult.transaction) {
      return { document };
    }
  }
  if (document.lead_id) {
    const lead = await base44.asServiceRole.entities.Lead.get(document.lead_id).catch(() => null);
    if (lead && lead.buyer_email === user.email) {
      return { document };
    }
  }
  return { error: Response.json({ error: 'Forbidden: You do not have access to this document' }, { status: 403 }) };
}