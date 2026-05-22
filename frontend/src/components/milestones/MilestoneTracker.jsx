import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MilestoneTracker({ transaction, userRole, userEmail }) {
  const queryClient = useQueryClient();
  const [noteDialog, setNoteDialog] = useState(null);
  const [note, setNote] = useState('');

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', transaction.market_id],
    queryFn: () => base44.entities.Milestone.filter({ market_id: transaction.market_id }, 'order')
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ milestoneId, isCompleting }) => {
      const completed = transaction.completed_milestones || [];
      let updated;

      if (isCompleting) {
        updated = [
          ...completed,
          {
            milestone_id: milestoneId,
            completed_date: new Date().toISOString(),
            completed_by: userEmail,
            notes: note
          }
        ];

        // Check if critical milestone to send notifications
        const milestone = milestones.find(m => m.id === milestoneId);
        if (milestone?.is_critical && milestone?.notify_roles) {
          // Send notifications (could integrate with SendEmail)
          await base44.integrations.Core.SendEmail({
            to: transaction.buyer_email,
            subject: `Milestone Completed: ${milestone.name}`,
            body: `The milestone "${milestone.name}" has been completed for your transaction.${note ? `\n\nNotes: ${note}` : ''}`
          });
        }
      } else {
        updated = completed.filter(c => c.milestone_id !== milestoneId);
      }

      return base44.entities.Transaction.update(transaction.id, {
        completed_milestones: updated
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction'] });
      toast.success('Milestone updated');
      setNoteDialog(null);
      setNote('');
    }
  });

  const handleMilestoneToggle = (milestone, isCompleted) => {
    if (!isCompleted && milestone.is_critical) {
      setNoteDialog(milestone);
    } else {
      updateTransactionMutation.mutate({
        milestoneId: milestone.id,
        isCompleting: !isCompleted
      });
    }
  };

  const handleCompleteWithNote = () => {
    if (noteDialog) {
      updateTransactionMutation.mutate({
        milestoneId: noteDialog.id,
        isCompleting: true
      });
    }
  };

  const stageMilestones = milestones.filter(m => m.stage === transaction.current_stage);
  const completed = transaction.completed_milestones || [];

  const isMilestoneCompleted = (milestoneId) => {
    return completed.some(c => c.milestone_id === milestoneId);
  };

  const getMilestoneCompletion = (milestoneId) => {
    return completed.find(c => c.milestone_id === milestoneId);
  };

  const canUserComplete = (milestone) => {
    if (milestone.responsible_role === 'any') return true;
    if (milestone.responsible_role === 'agent' && userRole === 'agent') return true;
    if (milestone.responsible_role === 'buyer' && userRole === 'buyer') return true;
    if (milestone.responsible_role === 'lender' && userRole === 'lender') return true;
    return userRole === 'builder' || userRole === 'admin';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction Milestones</span>
            <Badge variant="outline">
              {completed.length} / {stageMilestones.length} completed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stageMilestones.length > 0 ? (
            <div className="space-y-3">
              {stageMilestones.map(milestone => {
                const isCompleted = isMilestoneCompleted(milestone.id);
                const completion = getMilestoneCompletion(milestone.id);
                const canComplete = canUserComplete(milestone);

                return (
                  <div
                    key={milestone.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isCompleted ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="pt-0.5">
                      {canComplete ? (
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => handleMilestoneToggle(milestone, isCompleted)}
                          disabled={updateTransactionMutation.isPending}
                        />
                      ) : (
                        isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400" />
                        )
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isCompleted ? 'text-green-900' : 'text-slate-900'}`}>
                          {milestone.name}
                        </span>
                        {milestone.is_critical && (
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                        )}
                        {milestone.required_for_next_stage && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-slate-600 mt-1">{milestone.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <span>Responsible: {milestone.responsible_role}</span>
                      </div>
                      {completion && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <div className="text-xs text-green-700">
                            Completed {format(new Date(completion.completed_date), 'MMM d, yyyy')} by {completion.completed_by}
                          </div>
                          {completion.notes && (
                            <div className="text-xs text-slate-600 mt-1">Notes: {completion.notes}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No milestones defined for this stage</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Critical Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              You're completing a critical milestone: <strong>{noteDialog?.name}</strong>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Add notes (optional)</label>
              <Textarea
                placeholder="Any additional information about this completion..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setNoteDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleCompleteWithNote} disabled={updateTransactionMutation.isPending}>
                {updateTransactionMutation.isPending ? 'Completing...' : 'Complete Milestone'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}