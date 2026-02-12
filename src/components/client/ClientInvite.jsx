import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Plus, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientInvite({ transactionId, agentEmail }) {
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      // Invite user to the app
      await base44.users.inviteUser(data.clientEmail, 'user');
      
      // Send invitation email
      await base44.integrations.Core.SendEmail({
        to: data.clientEmail,
        subject: 'You have been invited to view your transaction',
        body: `Hello ${data.clientName},\n\nYour agent ${agentEmail} has invited you to view your transaction details on our secure client portal.\n\nPlease click the link to get started and set up your account.`
      });

      return { email: data.clientEmail, invited_date: new Date() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionClients'] });
      setClientEmail('');
      setClientName('');
      setInviteOpen(false);
      toast.success('Client invited successfully!');
    },
    onError: () => {
      toast.error('Failed to invite client');
    }
  });

  const portalUrl = `${window.location.origin}/buyer-portal`;

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invite Clients to Portal</CardTitle>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-3 h-3" /> Invite Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Invite Client to Portal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Client Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Client Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p className="text-blue-900">The client will receive an email invitation and can access the portal to view deal progress, documents, and milestones.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => inviteMutation.mutate({ clientEmail, clientName })}
                  disabled={!clientEmail || !clientName || inviteMutation.isPending}
                  className="flex-1"
                >
                  {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Portal Link</p>
              <p className="text-xs text-slate-600 mt-1">{portalUrl}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyPortalLink}
              className="gap-1"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span className="text-xs">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Share this link directly with clients or use the invite button to send them an email with automatic account setup.
        </p>
      </CardContent>
    </Card>
  );
}