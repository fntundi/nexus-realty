import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

export default function NotificationBell({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const notifs = await base44.entities.Notification.filter({ recipient_email: userEmail }, '-created_date');
      return notifs || [];
    },
    enabled: !!userEmail,
    refetchInterval: 10000 // Refetch every 10 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.update(notificationId, {
        is_read: true,
        read_date: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const priorityColors = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-yellow-50 border-yellow-200',
    low: 'bg-blue-50 border-blue-200'
  };

  const typeEmojis = {
    lead_assigned: '👤',
    deal_update: '📊',
    document_request: '📄',
    closing_reminder: '⏰',
    new_offer: '💰',
    system: '⚙️'
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="sticky top-0 bg-white border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`border-b p-3 ${priorityColors[notif.priority] || priorityColors.low} ${
                  !notif.is_read ? 'font-medium' : ''
                }`}
              >
                <div className="flex gap-2">
                  <span className="text-lg">{typeEmojis[notif.notification_type] || '📢'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{notif.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(notif.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!notif.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsReadMutation.mutate(notif.id)}
                        className="text-blue-600 text-xs"
                      >
                        Mark read
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteNotificationMutation.mutate(notif.id)}
                      className="h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              No notifications yet
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}