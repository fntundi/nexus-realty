import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ClientOnboardingProgress({ contactId }) {
  const queryClient = useQueryClient();

  const { data: progress = [] } = useQuery({
    queryKey: ['onboarding-progress', contactId],
    queryFn: () => base44.entities.OnboardingProgress.filter({ contact_id: contactId }),
    enabled: !!contactId
  });

  const activeProgress = progress.find(p => p.status === 'in_progress');

  const { data: workflow } = useQuery({
    queryKey: ['workflow', activeProgress?.workflow_id],
    queryFn: () => base44.entities.OnboardingWorkflow.get(activeProgress.workflow_id),
    enabled: !!activeProgress?.workflow_id
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ progressId, itemIndex, completed }) => {
      const updated = activeProgress.checklist_progress.map((item, idx) => {
        if (idx === itemIndex) {
          return {
            ...item,
            completed,
            completed_date: completed ? new Date().toISOString() : null,
            completed_by: completed ? 'agent' : null
          };
        }
        return item;
      });

      const completedCount = updated.filter(i => i.completed).length;
      const percentage = Math.round((completedCount / updated.length) * 100);
      const allCompleted = percentage === 100;

      return base44.entities.OnboardingProgress.update(progressId, {
        checklist_progress: updated,
        completion_percentage: percentage,
        status: allCompleted ? 'completed' : 'in_progress',
        completed_date: allCompleted ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding-progress']);
      toast.success('Checklist updated');
    }
  });

  if (!activeProgress) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          <p>No active onboarding</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Onboarding Progress</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {workflow?.name || 'Loading...'}
            </p>
          </div>
          <Badge className={
            activeProgress.status === 'completed' ? 'bg-green-100 text-green-800' :
            'bg-blue-100 text-blue-800'
          }>
            {activeProgress.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Overall Progress</span>
            <span className="font-semibold">{activeProgress.completion_percentage}%</span>
          </div>
          <Progress value={activeProgress.completion_percentage} className="h-2" />
        </div>

        {/* Welcome Message Status */}
        {workflow?.welcome_message?.subject && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
            <Mail className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-700">
              Welcome message: {activeProgress.welcome_message_sent ? (
                <span className="text-green-600 font-medium">Sent</span>
              ) : (
                <span className="text-amber-600 font-medium">Pending</span>
              )}
            </span>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900">Checklist</h4>
          {activeProgress.checklist_progress.map((item, idx) => (
            <div 
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                item.completed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
              }`}
            >
              <button
                onClick={() => updateChecklistMutation.mutate({
                  progressId: activeProgress.id,
                  itemIndex: idx,
                  completed: !item.completed
                })}
                className="flex-shrink-0 mt-0.5"
              >
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400" />
                )}
              </button>
              <div className="flex-1">
                <div className={`font-medium ${item.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                  {item.title}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due: {format(new Date(item.due_date), 'MMM d')}
                  </span>
                  {item.completed && item.completed_date && (
                    <span className="text-green-600">
                      Completed: {format(new Date(item.completed_date), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
          <div>
            <div className="text-slate-600">Started</div>
            <div className="font-medium">{format(new Date(activeProgress.started_date), 'MMM d, yyyy')}</div>
          </div>
          {activeProgress.last_reminder_sent && (
            <div>
              <div className="text-slate-600">Last Reminder</div>
              <div className="font-medium">{format(new Date(activeProgress.last_reminder_sent), 'MMM d, yyyy')}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}