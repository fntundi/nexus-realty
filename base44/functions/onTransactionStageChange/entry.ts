import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { INTERNAL_SECRET } from '../../shared/security.ts';

/**
 * Entity Automation Handler — fires on Transaction create/update.
 * Detects stage changes and dispatches the workflow engine.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    // Authenticate: internal automation calls (shared secret) or admin/agent
    // users — rejects anonymous external callers
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      if (!['admin', 'agent'].includes(user.role)) {
        return Response.json({ error: 'Forbidden: Insufficient role' }, { status: 403 });
      }
    } else if ((payload.internal_secret ?? payload.args?.internal_secret) !== INTERNAL_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = payload;

    // Only care about update events with a stage change
    if (event?.type !== 'update' && event?.type !== 'create') {
      return Response.json({ success: true, message: 'Not a relevant event' });
    }

    const transaction = data;
    if (!transaction) {
      return Response.json({ success: true, message: 'No transaction data' });
    }

    const newStage = transaction.current_stage;
    const oldStage = old_data?.current_stage;

    // For creates, treat from_stage as null
    const isCreate = event?.type === 'create';
    const stageChanged = isCreate || (oldStage && newStage && oldStage !== newStage);

    if (!stageChanged) {
      return Response.json({ success: true, message: 'No stage change detected' });
    }

    console.log(`[StageChange] Transaction ${transaction.id}: ${oldStage || 'NEW'} → ${newStage}`);

    // Fire the workflow engine
    const result = await base44.asServiceRole.functions.invoke('stageTransitionWorkflow', {
      transaction_id: transaction.id,
      internal_secret: INTERNAL_SECRET,
      from_stage: oldStage || null,
      to_stage: newStage
    });

    // Extract parsed data — the raw SDK response object is not JSON-serializable
    return Response.json({ success: true, workflow_result: result?.data ?? result });

  } catch (error) {
    console.error('[onTransactionStageChange] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});