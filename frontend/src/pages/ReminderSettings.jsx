import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReminderSettings() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    enabled: true,
    inactive_deal_days: 7,
    closing_date_days: 14,
    overdue_milestone_days: 3,
    no_offer_days: 21,
    check_interval: 'daily',
    reminder_time: '09:00',
    only_active_deals: true,
    snooze_options: [1, 3, 7]
  });

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

  const { data: config, isLoading } = useQuery({
    queryKey: ['reminderConfig', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const configs = await base44.entities.ReminderConfig.filter({ agent_email: user.email });
      return configs?.[0] || null;
    },
    enabled: !!user
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (config?.id) {
        return base44.entities.ReminderConfig.update(config.id, data);
      } else {
        return base44.entities.ReminderConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminderConfig'] });
    }
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = () => {
    saveMutation.mutate({
      ...formData,
      agent_email: user.email
    });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reminder Settings</h1>
        <p className="text-slate-600">Customize when and how you receive follow-up reminders</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Trigger Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(c) => setFormData({ ...formData, enabled: c })}
                />
                <Label htmlFor="enabled" className="cursor-pointer">Enable reminders</Label>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="inactive">Days of inactivity before reminder</Label>
                <Input
                  id="inactive"
                  type="number"
                  min="0"
                  value={formData.inactive_deal_days}
                  onChange={(e) => setFormData({ ...formData, inactive_deal_days: parseInt(e.target.value) || 0 })}
                  placeholder="0 to disable"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 to disable this trigger</p>
              </div>

              <div>
                <Label htmlFor="closing">Days before closing date to remind</Label>
                <Input
                  id="closing"
                  type="number"
                  min="0"
                  value={formData.closing_date_days}
                  onChange={(e) => setFormData({ ...formData, closing_date_days: parseInt(e.target.value) || 0 })}
                  placeholder="0 to disable"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 to disable this trigger</p>
              </div>

              <div>
                <Label htmlFor="overdue">Days overdue for milestone before reminder</Label>
                <Input
                  id="overdue"
                  type="number"
                  min="0"
                  value={formData.overdue_milestone_days}
                  onChange={(e) => setFormData({ ...formData, overdue_milestone_days: parseInt(e.target.value) || 0 })}
                  placeholder="0 to disable"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 to disable this trigger</p>
              </div>

              <div>
                <Label htmlFor="no-offer">Days in showing stage without offer</Label>
                <Input
                  id="no-offer"
                  type="number"
                  min="0"
                  value={formData.no_offer_days}
                  onChange={(e) => setFormData({ ...formData, no_offer_days: parseInt(e.target.value) || 0 })}
                  placeholder="0 to disable"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 to disable this trigger</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active-only"
                  checked={formData.only_active_deals}
                  onCheckedChange={(c) => setFormData({ ...formData, only_active_deals: c })}
                />
                <Label htmlFor="active-only" className="cursor-pointer">Only remind about active deals</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frequency & Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="interval">Check interval</Label>
              <Select value={formData.check_interval} onValueChange={(v) => setFormData({ ...formData, check_interval: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Once daily</SelectItem>
                  <SelectItem value="twice_daily">Twice daily</SelectItem>
                  <SelectItem value="weekly">Once weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time">Preferred time for reminders</Label>
              <Input
                id="time"
                type="time"
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snooze Options</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-3">Hours available when snoozing a reminder:</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 3, 6, 12, 24].map(hours => (
                <label key={hours} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.snooze_options?.includes(hours)}
                    onCheckedChange={(c) => {
                      const options = formData.snooze_options || [];
                      if (c) {
                        setFormData({ ...formData, snooze_options: [...options, hours].sort((a, b) => a - b) });
                      } else {
                        setFormData({ ...formData, snooze_options: options.filter(h => h !== hours) });
                      }
                    }}
                  />
                  <span className="text-sm">{hours === 1 ? '1h' : hours === 24 ? '1d' : `${hours}h`}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
          {saveMutation.isSuccess && (
            <div className="flex items-center text-green-600">✓ Settings saved</div>
          )}
        </div>
      </div>
    </div>
  );
}