import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function CalendarConnection({ currentUser }) {
  const queryClient = useQueryClient();

  const { data: globalConfig } = useQuery({
    queryKey: ['calendar-global-config'],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: 'calendar_settings' });
      return configs[0]?.config_value || { enabled: false };
    }
  });

  const { data: userConnection } = useQuery({
    queryKey: ['calendar-connection', currentUser.email],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ 
        config_key: `calendar_connection_${currentUser.email}` 
      });
      return configs[0] || null;
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (userConnection?.id) {
        return base44.entities.AppConfig.delete(userConnection.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connection'] });
      toast.success('Calendar disconnected');
    }
  });

  const handleConnectGoogle = () => {
    const returnUrl = window.location.href;
    window.location.href = `${base44.baseURL}/oauth/authorize/googlecalendar?return_url=${encodeURIComponent(returnUrl)}`;
  };

  const saveConnection = async (provider) => {
    await base44.entities.AppConfig.create({
      config_key: `calendar_connection_${currentUser.email}`,
      config_value: {
        connected: true,
        provider: provider,
        connected_date: new Date().toISOString()
      },
      description: `Calendar connection for ${currentUser.email}`
    });
    queryClient.invalidateQueries({ queryKey: ['calendar-connection'] });
  };

  if (!globalConfig?.enabled) {
    return (
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Calendar integration is not enabled. Contact your administrator to enable this feature.
        </AlertDescription>
      </Alert>
    );
  }

  const isConnected = userConnection?.config_value?.connected;
  const provider = userConnection?.config_value?.provider;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendar Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">Connected to {provider === 'google' ? 'Google Calendar' : 'Calendar'}</div>
                  <div className="text-sm text-slate-600">
                    Showings will sync automatically
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Connect your calendar to automatically sync showings and prevent double-booking.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleConnectGoogle} className="flex-1">
                <Calendar className="w-4 h-4 mr-2" />
                Connect Google Calendar
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                <Calendar className="w-4 h-4 mr-2" />
                Outlook Calendar (Coming Soon)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}