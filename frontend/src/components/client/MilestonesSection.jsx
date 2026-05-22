import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function MilestonesSection({ transaction, milestones }) {
  if (!milestones || milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">No milestones scheduled yet</p>
        </CardContent>
      </Card>
    );
  }

  // Separate completed and upcoming milestones
  const completed = transaction?.completed_milestones || [];
  const completedIds = new Set(completed.map(m => m.milestone_id));
  
  const upcomingMilestones = milestones.filter(m => !completedIds.has(m.id));
  const completedMilestones = milestones.filter(m => completedIds.has(m.id));

  const getMilestoneIcon = (completed) => {
    if (completed) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    return <Clock className="w-5 h-5 text-blue-600" />;
  };

  const getMilestoneDate = (milestone) => {
    const completedMilestone = completed.find(m => m.milestone_id === milestone.id);
    return completedMilestone?.completed_date;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones & Appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {upcomingMilestones.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 text-slate-700">Upcoming</h4>
            <div className="space-y-3">
              {upcomingMilestones.map(milestone => (
                <div key={milestone.id} className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{milestone.name}</p>
                    {milestone.description && (
                      <p className="text-xs text-slate-600 mt-1">{milestone.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {transaction.current_stage?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {completedMilestones.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 text-slate-700">Completed</h4>
            <div className="space-y-2">
              {completedMilestones.map(milestone => {
                const completedDate = getMilestoneDate(milestone);
                return (
                  <div key={milestone.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg opacity-75">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 line-through">{milestone.name}</p>
                      {completedDate && (
                        <p className="text-xs text-slate-600 mt-1">
                          Completed {format(new Date(completedDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}