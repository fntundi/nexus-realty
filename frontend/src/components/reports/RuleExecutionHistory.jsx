import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function RuleExecutionHistory({ rules = [], filters }) {
  const sortedRules = useMemo(() => {
    return rules
      .filter(rule => rule.last_execution)
      .sort((a, b) => new Date(b.last_execution) - new Date(a.last_execution))
      .slice(0, 10);
  }, [rules]);

  const getActionBadgeColor = (actionType) => {
    const colors = {
      reassign_lead: 'bg-blue-100 text-blue-800',
      create_task: 'bg-purple-100 text-purple-800',
      send_notification: 'bg-green-100 text-green-800'
    };
    return colors[actionType] || 'bg-slate-100 text-slate-800';
  };

  const getActionLabel = (actionType) => {
    const labels = {
      reassign_lead: 'Reassign Lead',
      create_task: 'Create Task',
      send_notification: 'Send Notification'
    };
    return labels[actionType] || actionType;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Rule Executions</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedRules.length > 0 ? (
          <div className="space-y-4">
            {sortedRules.map(rule => (
              <div key={rule.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{rule.name}</p>
                    <p className="text-sm text-slate-600 mt-1">{rule.description}</p>
                  </div>
                  <Badge className={getActionBadgeColor(rule.action_type)}>
                    {getActionLabel(rule.action_type)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                  <div className="text-slate-600">
                    <span className="text-slate-500">Score Threshold:</span> {rule.score_threshold}
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-500">Executions:</span> {rule.execution_count || 0}
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-500">Status:</span> 
                    <Badge variant={rule.is_active ? 'default' : 'outline'} className="ml-1">
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-500">Last Run:</span> {format(new Date(rule.last_execution), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No rule executions found</p>
        )}
      </CardContent>
    </Card>
  );
}