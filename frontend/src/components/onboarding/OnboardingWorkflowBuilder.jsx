import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, CheckSquare, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingWorkflowBuilder() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);

  const { data: workflows = [] } = useQuery({
    queryKey: ['onboarding-workflows'],
    queryFn: () => base44.entities.OnboardingWorkflow.list('-created_date')
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Onboarding Workflows</h2>
          <p className="text-slate-600">Create automated onboarding experiences for new clients</p>
        </div>
        <Button onClick={() => {
          setEditingWorkflow(null);
          setDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="grid gap-4">
        {workflows.map(workflow => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{workflow.name}</CardTitle>
                  <p className="text-sm text-slate-600 capitalize mt-1">
                    For: {workflow.client_type} clients
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditingWorkflow(workflow);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-600">Checklist Items</div>
                  <div className="font-semibold">{workflow.checklist_items?.length || 0}</div>
                </div>
                <div>
                  <div className="text-slate-600">Auto Tasks</div>
                  <div className="font-semibold">{workflow.auto_tasks?.length || 0}</div>
                </div>
                <div>
                  <div className="text-slate-600">Welcome Message</div>
                  <div className="font-semibold">{workflow.welcome_message?.subject ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {workflows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <CheckSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No workflows created yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      <WorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workflow={editingWorkflow}
        userEmail={user?.email}
      />
    </div>
  );
}

function WorkflowDialog({ open, onOpenChange, workflow, userEmail }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(workflow || {
    name: '',
    client_type: 'buyer',
    welcome_message: {
      subject: '',
      body: '',
      send_immediately: true
    },
    checklist_items: [],
    auto_tasks: [],
    is_active: true
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (workflow) {
        return base44.entities.OnboardingWorkflow.update(workflow.id, data);
      }
      return base44.entities.OnboardingWorkflow.create({
        ...data,
        created_by: userEmail
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding-workflows']);
      toast.success(workflow ? 'Workflow updated' : 'Workflow created');
      onOpenChange(false);
    }
  });

  const addChecklistItem = () => {
    setFormData({
      ...formData,
      checklist_items: [
        ...formData.checklist_items,
        {
          title: '',
          description: '',
          order: formData.checklist_items.length,
          required: true,
          estimated_days: 7,
          assigned_to: 'agent',
          reminder_before_days: 1
        }
      ]
    });
  };

  const addAutoTask = () => {
    setFormData({
      ...formData,
      auto_tasks: [
        ...formData.auto_tasks,
        {
          task_title: '',
          task_description: '',
          task_type: 'call',
          priority: 'medium',
          due_days_offset: 1,
          assign_to: 'agent'
        }
      ]
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workflow ? 'Edit' : 'Create'} Onboarding Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Workflow Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="New Buyer Onboarding"
              />
            </div>
            <div>
              <Label>Client Type</Label>
              <Select value={formData.client_type} onValueChange={(val) => setFormData({ ...formData, client_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="all">All Types</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Welcome Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Welcome Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Subject</Label>
                <Input
                  value={formData.welcome_message?.subject || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    welcome_message: { ...formData.welcome_message, subject: e.target.value }
                  })}
                  placeholder="Welcome to our team, {{first_name}}!"
                />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea
                  value={formData.welcome_message?.body || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    welcome_message: { ...formData.welcome_message, body: e.target.value }
                  })}
                  placeholder="Dear {{first_name}},&#10;&#10;Welcome! We're excited to work with you..."
                  rows={4}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use {'{{first_name}}'}, {'{{last_name}}'}, {'{{agent_email}}'} for personalization
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Checklist Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Checklist Items ({formData.checklist_items?.length || 0})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={addChecklistItem}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.checklist_items?.map((item, idx) => (
                <Card key={idx} className="p-3">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Checklist item title"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...formData.checklist_items];
                          updated[idx].title = e.target.value;
                          setFormData({ ...formData, checklist_items: updated });
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const updated = formData.checklist_items.filter((_, i) => i !== idx);
                          setFormData({ ...formData, checklist_items: updated });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <Input
                        type="number"
                        placeholder="Days"
                        value={item.estimated_days}
                        onChange={(e) => {
                          const updated = [...formData.checklist_items];
                          updated[idx].estimated_days = Number(e.target.value);
                          setFormData({ ...formData, checklist_items: updated });
                        }}
                      />
                      <Select
                        value={item.assigned_to}
                        onValueChange={(val) => {
                          const updated = [...formData.checklist_items];
                          updated[idx].assigned_to = val;
                          setFormData({ ...formData, checklist_items: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Remind days before"
                        value={item.reminder_before_days}
                        onChange={(e) => {
                          const updated = [...formData.checklist_items];
                          updated[idx].reminder_before_days = Number(e.target.value);
                          setFormData({ ...formData, checklist_items: updated });
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Auto Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Auto-Generated Tasks ({formData.auto_tasks?.length || 0})</CardTitle>
                <Button size="sm" variant="outline" onClick={addAutoTask}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.auto_tasks?.map((task, idx) => (
                <Card key={idx} className="p-3">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Task title"
                        value={task.task_title}
                        onChange={(e) => {
                          const updated = [...formData.auto_tasks];
                          updated[idx].task_title = e.target.value;
                          setFormData({ ...formData, auto_tasks: updated });
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const updated = formData.auto_tasks.filter((_, i) => i !== idx);
                          setFormData({ ...formData, auto_tasks: updated });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <Select
                        value={task.task_type}
                        onValueChange={(val) => {
                          const updated = [...formData.auto_tasks];
                          updated[idx].task_type = val;
                          setFormData({ ...formData, auto_tasks: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="follow_up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={task.priority}
                        onValueChange={(val) => {
                          const updated = [...formData.auto_tasks];
                          updated[idx].priority = val;
                          setFormData({ ...formData, auto_tasks: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Due in days"
                        value={task.due_days_offset}
                        onChange={(e) => {
                          const updated = [...formData.auto_tasks];
                          updated[idx].due_days_offset = Number(e.target.value);
                          setFormData({ ...formData, auto_tasks: updated });
                        }}
                      />
                      <Select
                        value={task.assign_to}
                        onValueChange={(val) => {
                          const updated = [...formData.auto_tasks];
                          updated[idx].assign_to = val;
                          setFormData({ ...formData, auto_tasks: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="buyer">Buyer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.name || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : workflow ? 'Update' : 'Create'} Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}