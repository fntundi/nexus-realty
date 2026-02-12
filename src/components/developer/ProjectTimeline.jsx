import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectTimeline({ milestones = [] }) {
  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          No milestones added yet
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'delayed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'permitting':
        return 'bg-yellow-100 text-yellow-800';
      case 'construction_phase':
        return 'bg-orange-100 text-orange-800';
      case 'sales_event':
        return 'bg-green-100 text-green-800';
      case 'completion':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-4">
      {milestones.map((milestone, idx) => (
        <div key={milestone.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
              {getStatusIcon(milestone.status)}
            </div>
            {idx < milestones.length - 1 && (
              <div className="w-1 h-20 bg-slate-200 my-2" />
            )}
          </div>

          {/* Content */}
          <Card className="flex-1 mt-2">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{milestone.title}</h4>
                    <Badge className={getCategoryColor(milestone.category)}>
                      {milestone.category.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-slate-600 mb-2">{milestone.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>Scheduled: {format(new Date(milestone.scheduled_date), 'MMM d, yyyy')}</span>
                    {milestone.actual_date && (
                      <span>Completed: {format(new Date(milestone.actual_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
                <Badge
                  variant={milestone.status === 'completed' ? 'default' : 'secondary'}
                >
                  {milestone.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}