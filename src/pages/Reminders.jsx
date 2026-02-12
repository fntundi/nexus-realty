import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Clock, AlertTriangle, Settings, Link as LinkIcon } from 'lucide-react';
import { createPageUrl } from '@/utils';

const REMINDER_TYPES = {
  inactive_deal: { label: 'Inactive Deal', icon: Clock, color: 'text-amber-600' },
  closing_approaching: { label: 'Closing Soon', icon: AlertTriangle, color: 'text-red-600' },
  overdue_milestone: { label: 'Overdue Task', icon: AlertCircle, color: 'text-red-600' },
  no_offer: { label: 'No Offer Yet', icon: Clock, color: 'text-amber-600' }
};

export default function Reminders() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [snoozeHours, setSnoozeHours] = useState(1);

  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    })();
  }, []);

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', user?.email, filter],
    queryFn: async () => {
      if (!user) return [];
      const now = new Date();
      const allReminders = await base44.entities.Reminder.filter({ agent_email: user.email });
      
      return allReminders.filter(r => {
        if (r.snoozed_until && new Date(r.snoozed_until) > now) return false;
        if (filter === 'pending') return r.status === 'pending';
        if (filter === 'acknowledged') return r.status === 'acknowledged';
        if (filter === 'completed') return r.status === 'completed';
        return true;
      }).sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    },
    enabled: !!user
  });

  const { data: config } = useQuery({
    queryKey: ['reminderConfig', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const configs = await base44.entities.ReminderConfig.filter({ agent_email: user.email });
      return configs?.[0] || null;
    },
    enabled: !!user
  });

  const updateReminderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reminder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const handleAcknowledge = (reminder) => {
    updateReminderMutation.mutate({
      id: reminder.id,
      data: { status: 'acknowledged', acknowledged_date: new Date().toISOString() }
    });
  };

  const handleComplete = (reminder) => {
    updateReminderMutation.mutate({
      id: reminder.id,
      data: { status: 'completed' }
    });
  };

  const handleSnooze = (reminder) => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + snoozeHours);
    updateReminderMutation.mutate({
      id: reminder.id,
      data: { status: 'snoozed', snoozed_until: snoozeUntil.toISOString() }
    });
    setSelectedReminder(null);
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-800';
    if (priority === 'medium') return 'bg-amber-100 text-amber-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const reminderType = selectedReminder ? REMINDER_TYPES[selectedReminder.reminder_type] : null;
  const Icon = reminderType?.icon;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Follow-Up Reminders</h1>
          <p className="text-slate-600 mt-1">{reminders?.length || 0} active reminders</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSettingsOpen(true)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" /> Settings
        </Button>
      </div>

      <div className="flex gap-2">
        {['pending', 'acknowledged', 'completed'].map(status => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {reminders && reminders.length > 0 ? (
          reminders.map(reminder => {
            const type = REMINDER_TYPES[reminder.reminder_type];
            return (
              <Card key={reminder.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      {type && (
                        <div className={`mt-1 p-2 rounded-lg bg-slate-100`}>
                          <type.icon className={`w-5 h-5 ${type.color}`} />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{reminder.title}</h3>
                          <Badge className={getPriorityColor(reminder.priority)}>
                            {reminder.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{reminder.description}</p>
                        <div className="flex gap-4 text-xs text-slate-500">
                          {reminder.metadata?.property_address && (
                            <span>📍 {reminder.metadata.property_address}</span>
                          )}
                          {reminder.metadata?.buyer_name && (
                            <span>👤 {reminder.metadata.buyer_name}</span>
                          )}
                          {reminder.metadata?.deal_value && (
                            <span>💰 ${reminder.metadata.deal_value.toLocaleString()}</span>
                          )}
                          {reminder.metadata?.days_since_activity && (
                            <span>⏱️ {reminder.metadata.days_since_activity} days inactive</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {reminder.action_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = reminder.action_url}
                          className="gap-1"
                        >
                          <LinkIcon className="w-3 h-3" /> View
                        </Button>
                      )}
                      {reminder.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(reminder)}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReminder(reminder)}
                          >
                            Snooze
                          </Button>
                        </>
                      )}
                      {reminder.status === 'acknowledged' && (
                        <Button
                          size="sm"
                          onClick={() => handleComplete(reminder)}
                          className="gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-slate-600">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-600" />
              <p>All caught up! No reminders for now.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {settingsOpen && (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reminder Settings</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-slate-600 space-y-2">
              <p>Configure your reminder triggers:</p>
              <ul className="space-y-1 ml-2">
                <li>• Days of inactivity: {config?.inactive_deal_days || 'Disabled'}</li>
                <li>• Days before closing: {config?.closing_date_days || 'Disabled'}</li>
                <li>• Overdue milestone days: {config?.overdue_milestone_days || 'Disabled'}</li>
                <li>• Days without offer: {config?.no_offer_days || 'Disabled'}</li>
              </ul>
            </div>
            <Button onClick={() => window.location.href = createPageUrl('ReminderSettings')}>
              Edit Settings
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {selectedReminder && (
        <Dialog open={!!selectedReminder} onOpenChange={() => setSelectedReminder(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Snooze Reminder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Snooze for:</label>
                <Select value={snoozeHours.toString()} onValueChange={(v) => setSnoozeHours(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(config?.snooze_options || [1, 3, 7]).map(hours => (
                      <SelectItem key={hours} value={hours.toString()}>
                        {hours === 1 ? '1 hour' : `${hours} hours`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReminder(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSnooze(selectedReminder)}
                  className="flex-1"
                >
                  Snooze
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}