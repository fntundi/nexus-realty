import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Entity Automation Handler — fires on Transaction create/update.
 * Detects stage changes and dispatches the workflow engine.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

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
      from_stage: oldStage || null,
      to_stage: newStage
    });

    return Response.json({ success: true, workflow_result: result });

  } catch (error) {
    console.error('[onTransactionStageChange] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});