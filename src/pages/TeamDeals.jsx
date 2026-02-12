import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, FileText, Users, Plus } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function TeamDeals() {
  const [user, setUser] = useState(null);
  const [filterStage, setFilterStage] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);

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

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['teamDeals', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const txns = await base44.entities.Transaction.list();
      return txns || [];
    },
    enabled: !!user
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: teamTasks } = useQuery({
    queryKey: ['teamTasks'],
    queryFn: async () => {
      const tasks = await base44.entities.TransactionTask.list();
      return tasks || [];
    }
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['dealMessages', selectedDeal?.id],
    queryFn: async () => {
      if (!selectedDeal) return [];
      const msgs = await base44.entities.Message.filter({ transaction_id: selectedDeal.id });
      return msgs || [];
    },
    enabled: !!selectedDeal
  });

  const assignTaskMutation = useMutation({
    mutationFn: ({ taskId, assignedToEmail }) =>
      base44.entities.TransactionTask.update(taskId, { assigned_to_user: assignedToEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      setAssignTaskDialogOpen(false);
    }
  });

  const filteredDeals = transactions
    ?.filter(t => filterStage === 'all' || t.current_stage === filterStage)
    .map(txn => {
      const property = properties?.find(p => p.id === txn.property_id);
      const agent = agents?.find(a => a.id === txn.agent_id);
      const dealTasks = teamTasks?.filter(t => t.transaction_id === txn.id) || [];
      const dealMessages = messages?.filter(m => m.transaction_id === txn.id) || [];
      return { ...txn, property, agent, tasks: dealTasks, messages: dealMessages };
    }) || [];

  const stageColors = {
    pre_qual: 'bg-blue-100 text-blue-800',
    showing: 'bg-amber-100 text-amber-800',
    offer: 'bg-purple-100 text-purple-800',
    under_contract: 'bg-green-100 text-green-800',
    closing: 'bg-red-100 text-red-800',
    closed: 'bg-slate-100 text-slate-800'
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Deals</h1>
          <p className="text-slate-600 mt-1">Collaborate with team members on active deals</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="pre_qual">Pre-Qual</SelectItem>
            <SelectItem value="showing">Showing</SelectItem>
            <SelectItem value="offer">Offer</SelectItem>
            <SelectItem value="under_contract">Under Contract</SelectItem>
            <SelectItem value="closing">Closing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredDeals.length > 0 ? (
          filteredDeals.map(deal => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{deal.property?.address}</CardTitle>
                    <div className="flex gap-2 items-center mt-2">
                      <Badge className={stageColors[deal.current_stage]}>
                        {deal.current_stage.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-slate-600">
                        ${deal.contract_price?.toLocaleString() || deal.property?.price?.toLocaleString() || 'TBD'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{deal.agent?.user_email}</p>
                    <p className="text-slate-600">{deal.buyer_email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span className="text-sm">{deal.tasks?.length || 0} tasks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-600" />
                    <span className="text-sm">{deal.messages?.length || 0} messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span className="text-sm">Docs</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDeal(deal)}
                    className="gap-2 flex-1"
                  >
                    <MessageSquare className="w-3 h-3" /> Messages
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignTaskDialogOpen(true)}
                    className="gap-2 flex-1"
                  >
                    <Plus className="w-3 h-3" /> Assign Task
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = createPageUrl('AgentTransactions')}
                    className="flex-1"
                  >
                    View Deal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-slate-600">
              No deals found
            </CardContent>
          </Card>
        )}
      </div>

      {selectedDeal && (
        <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Messages - {selectedDeal.property?.address}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-2 bg-slate-50 p-3 rounded-lg">
                {messages && messages.length > 0 ? (
                  messages.map(msg => (
                    <div key={msg.id} className="bg-white p-2 rounded text-sm">
                      <div className="font-medium text-xs text-slate-600">{msg.sender_email}</div>
                      <div>{msg.content}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No messages yet</p>
                )}
              </div>
              <Button className="w-full gap-2">
                <MessageSquare className="w-3 h-3" /> Open Full Chat
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {assignTaskDialogOpen && (
        <Dialog open={assignTaskDialogOpen} onOpenChange={setAssignTaskDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Assign Task to Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Assign to:</label>
                <Select defaultValue="">
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.map(agent => (
                      <SelectItem key={agent.id} value={agent.user_email}>
                        {agent.user_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Assign Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}