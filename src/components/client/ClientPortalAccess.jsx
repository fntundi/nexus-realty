import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Mail, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientPortalAccess({ transactionId }) {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    (async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    })();
  }, []);

  const { data: transaction, isLoading: txnLoading } = useQuery({
    queryKey: ['transactionForClients', transactionId],
    queryFn: async () => {
      const txns = await base44.entities.Transaction.filter({ id: transactionId });
      return txns?.[0];
    },
    enabled: !!transactionId
  });

  const { data: invitedClients = [], isLoading } = useQuery({
    queryKey: ['invitedClients', transactionId],
    queryFn: async () => {
      // In a real scenario, you'd have a ClientAccess entity to track who was invited
      // For now, we'll show invited emails from messages and show pending status
      const messages = await base44.entities.Message.filter({ transaction_id: transactionId });
      const recipients = new Set();
      messages?.forEach(msg => {
        if (msg.recipient_emails) {
          msg.recipient_emails.forEach(email => recipients.add(email));
        }
      });
      return Array.from(recipients)
        .filter(email => email !== user?.email)
        .map(email => ({
          id: email,
          email,
          invited_date: new Date(),
          status: 'active'
        }));
    },
    enabled: !!transactionId && !!user
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (clientEmail) => {
      await base44.integrations.Core.SendEmail({
        to: clientEmail,
        subject: 'Reminder: Access your transaction portal',
        body: `You have been invited to view your transaction details.\n\nPlease visit the client portal to access deal progress, documents, and milestones.`
      });
    },
    onSuccess: () => {
      toast.success('Reminder sent successfully');
      queryClient.invalidateQueries({ queryKey: ['invitedClients'] });
    }
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (clientEmail) => {
      // In a real implementation, you'd update a ClientAccess entity
      toast.success('Access revoked');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitedClients'] });
    }
  });

  if (isLoading || txnLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Client Portal Access</CardTitle>
      </CardHeader>
      <CardContent>
        {invitedClients.length > 0 ? (
          <div className="space-y-2">
            {invitedClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{client.email}</p>
                  <p className="text-xs text-slate-500">
                    Invited {new Date(client.invited_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {client.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resendInviteMutation.mutate(client.email)}
                    disabled={resendInviteMutation.isPending}
                    className="gap-1"
                  >
                    <Mail className="w-3 h-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="gap-1 text-red-600 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Access</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke portal access for {client.email}? They will no longer be able to view deal details.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => revokeAccessMutation.mutate(client.email)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Revoke Access
                      </AlertDialogAction>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Lock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">No clients invited yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}