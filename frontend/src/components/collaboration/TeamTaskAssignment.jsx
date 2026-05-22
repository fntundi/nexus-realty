import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, CheckCircle2, Circle } from 'lucide-react';

export default function TeamTaskAssignment({ transactionId, userEmail }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', assigned_to_user: '' });
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['transactionTasks', transactionId],
    queryFn: async () => {
      const t = await base44.entities.TransactionTask.filter({ transaction_id: transactionId });
      return t || [];
    },
    enabled: !!transactionId
  });

  const { data: agents } = useQuery({
    queryKey: ['agentsForTasks'],
    queryFn: () => base44.entities.Agent.list()
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.TransactionTask.create({
        transaction_id: transactionId,
        title: data.title,
        assigned_to_user: data.assigned_to_user,
        status: 'not_started',
        priority: 'medium',
        stage: 'under_contract'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionTasks'] });
      setCreateDialogOpen(false);
      setFormData({ title: '', assigned_to_user: '' });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TransactionTask.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactionTasks'] })
  });

  const getAgentName = (email) => email.split('@')[0];

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const assignedToMe = tasks?.filter(t => t.assigned_to_user === userEmail) || [];
  const assignedByMe = tasks?.filter(t => t.assigned_to_user && t.assigned_to_user !== userEmail) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Team Tasks</CardTitle>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-3 h-3" /> Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create & Assign Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Get lender approval"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="agent">Assign to</Label>
                <Select value={formData.assigned_to_user} onValueChange={(v) => setFormData({ ...formData, assigned_to_user: v })}>
                  <SelectTrigger className="mt-1">
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => createTaskMutation.mutate(formData)}
                  disabled={!formData.title || !formData.assigned_to_user || createTaskMutation.isPending}
                  className="flex-1"
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignedToMe.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Assigned to Me</h4>
            <div className="space-y-2">
              {assignedToMe.map(task => (
                <div key={task.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <button
                    onClick={() =>
                      updateTaskMutation.mutate({
                        id: task.id,
                        status: task.status === 'completed' ? 'in_progress' : 'completed'
                      })
                    }
                    className="flex-shrink-0"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {assignedByMe.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Assigned by Me</h4>
            <div className="space-y-2">
              {assignedByMe.map(task => (
                <div key={task.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-slate-500">{getAgentName(task.assigned_to_user)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks?.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-4">No tasks yet</p>
        )}
      </CardContent>
    </Card>
  );
}