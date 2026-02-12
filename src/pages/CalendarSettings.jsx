import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import CalendarConnection from '../components/calendar/CalendarConnection';

export default function CalendarSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['calendar-global-config'],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: 'calendar_settings' });
      if (configs.length === 0) {
        return { id: null, enabled: false };
      }
      return { id: configs[0].id, ...configs[0].config_value };
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (enabled) => {
      if (config.id) {
        return base44.entities.AppConfig.update(config.id, {
          config_value: { enabled }
        });
      } else {
        return base44.entities.AppConfig.create({
          config_key: 'calendar_settings',
          config_value: { enabled },
          description: 'Calendar integration settings'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-global-config'] });
      toast.success('Settings updated');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Calendar Integration</h1>
          <p className="text-slate-600 mt-1">Sync showings with your calendar</p>
        </div>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
              <CardDescription>
                Enable or disable calendar sync functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enabled" className="text-base">
                    Enable Calendar Integration
                  </Label>
                  <p className="text-sm text-slate-600">
                    Allow users to connect their calendars and sync showings
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={config?.enabled || false}
                  onCheckedChange={(checked) => updateConfigMutation.mutate(checked)}
                  disabled={updateConfigMutation.isPending}
                />
              </div>

              {config?.enabled && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Calendar integration is enabled. Users can now connect their calendars.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {user && <CalendarConnection currentUser={user} />}

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatically sync accepted showings to your calendar</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Check availability before scheduling to prevent double-booking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Export showing details with location and attendees</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatic reminders before scheduled showings</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}