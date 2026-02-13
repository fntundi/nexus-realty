import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, CheckCircle, User, Calendar } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';

export default function FollowUpReminders({ agentEmail }) {
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['agent-reminders', agentEmail],
    queryFn: () => base44.entities.Task.filter({ 
      assigned_to_email: agentEmail,
      status: 'pending'
    }, 'due_date'),
    enabled: !!agentEmail
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list()
  });

  const completeTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.update(taskId, { 
      status: 'completed',
      completed_date: new Date().toISOString(),
      completed_by_email: agentEmail
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-reminders']);
      toast.success('Task completed');
    }
  });

  const snoozeTaskMutation = useMutation({
    mutationFn: ({ taskId, newDate }) => base44.entities.Task.update(taskId, { 
      due_date: newDate
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-reminders']);
      toast.success('Reminder snoozed');
    }
  });

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown';
  };

  const overdueReminders = tasks.filter(t => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const todayReminders = tasks.filter(t => isToday(new Date(t.due_date)));
  const upcomingReminders = tasks.filter(t => !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const ReminderCard = ({ task, isOverdue }) => (
    <Card className={isOverdue ? 'border-red-300 bg-red-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              <Badge variant="outline">{task.task_type}</Badge>
            </div>
            
            <h4 className="font-semibold text-slate-900 mb-1">{task.title}</h4>
            
            {task.description && (
              <p className="text-sm text-slate-600 mb-2">{task.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-slate-600">
              {task.contact_id && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {getContactName(task.contact_id)}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), 'MMM dd, h:mm a')}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={() => completeTaskMutation.mutate(task.id)}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              snoozeTaskMutation.mutate({ taskId: task.id, newDate: tomorrow.toISOString() });
            }}
          >
            <Clock className="w-3 h-3 mr-1" />
            Snooze
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{overdueReminders.length}</div>
            <div className="text-sm text-slate-600">Overdue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{todayReminders.length}</div>
            <div className="text-sm text-slate-600">Due Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{upcomingReminders.length}</div>
            <div className="text-sm text-slate-600">Upcoming</div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue */}
      {overdueReminders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-600" />
            Overdue ({overdueReminders.length})
          </h3>
          <div className="space-y-3">
            {overdueReminders.map(task => (
              <ReminderCard key={task.id} task={task} isOverdue />
            ))}
          </div>
        </div>
      )}

      {/* Today */}
      {todayReminders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Due Today ({todayReminders.length})
          </h3>
          <div className="space-y-3">
            {todayReminders.map(task => (
              <ReminderCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingReminders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            Upcoming ({upcomingReminders.length})
          </h3>
          <div className="space-y-3">
            {upcomingReminders.slice(0, 5).map(task => (
              <ReminderCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-600 text-center">No pending reminders</p>
            <p className="text-sm text-slate-500 text-center mt-2">
              You're all caught up!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}