import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Phone,
  Calendar,
  Mail,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Link as LinkIcon
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const taskTypeIcons = {
  call: Phone,
  meeting: Calendar,
  follow_up: Clock,
  email: Mail,
  document: Mail,
  other: Circle
};

export default function TaskCard({ task, onComplete }) {
  const queryClient = useQueryClient();

  const completeTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.update(taskId, { status: 'completed', completed_date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task completed!');
      onComplete?.();
    }
  });

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    pending: 'text-slate-600',
    in_progress: 'text-blue-600',
    completed: 'text-green-600',
    cancelled: 'text-slate-400'
  };

  const IconComponent = taskTypeIcons[task.task_type] || Circle;
  const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="pt-1">
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={() => completeTaskMutation.mutate(task.id)}
              disabled={completeTaskMutation.isPending}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <IconComponent className="w-5 h-5 text-slate-600" />
                <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {task.title}
                </h3>
              </div>
              <div className="flex gap-2">
                <Badge className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
                {isOverdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
            </div>

            {task.description && (
              <p className="text-sm text-slate-600 mb-2">{task.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(task.due_date).toLocaleDateString()} {new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>

              {task.contact_email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {task.contact_email}
                </div>
              )}

              {task.meeting_location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {task.meeting_location}
                </div>
              )}

              {task.duration_minutes && (
                <div className="flex items-center gap-1">
                  ⏱ {task.duration_minutes} min
                </div>
              )}
            </div>

            {task.meeting_link && (
              <a
                href={task.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mb-3"
              >
                <LinkIcon className="w-4 h-4" />
                Join Meeting
              </a>
            )}

            {task.notes && (
              <p className="text-xs text-slate-600 bg-slate-100 p-2 rounded mb-3">{task.notes}</p>
            )}

            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}