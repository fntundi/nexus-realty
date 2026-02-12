import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function LeadScoringRuleForm({ rule, onSuccess }) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    score_threshold: rule?.score_threshold || 50,
    is_active: rule?.is_active ?? true,
    action_type: rule?.action_type || 'reassign_lead',
    reassign_to_agent_email: rule?.reassign_to_agent_email || '',
    task_title: rule?.task_title || '',
    task_description: rule?.task_description || '',
    task_priority: rule?.task_priority || 'medium',
    notification_message: rule?.notification_message || '',
    notify_agent_email: rule?.notify_agent_email || ''
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (rule?.id) {
        return base44.entities.LeadScoringRule.update(rule.id, data);
      }
      return base44.entities.LeadScoringRule.create(data);
    },
    onSuccess: () => {
      toast.success(rule?.id ? 'Rule updated' : 'Rule created');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to save rule');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.action_type) {
      toast.error('Name and action type are required');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-sm mb-1 block">Rule Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="e.g., Hot leads auto-reassign"
          className="h-8"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-sm mb-1 block">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="What does this rule do?"
          className="h-16"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="score_threshold" className="text-sm mb-1 block">Score Threshold *</Label>
          <Input
            id="score_threshold"
            type="number"
            min="0"
            max="100"
            value={formData.score_threshold}
            onChange={(e) => setFormData({...formData, score_threshold: parseInt(e.target.value)})}
            className="h-8"
          />
        </div>
        <div className="flex items-end">
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
            />
            <Label htmlFor="is_active" className="text-sm cursor-pointer">Active</Label>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="action_type" className="text-sm mb-1 block">Action Type *</Label>
        <Select value={formData.action_type} onValueChange={(value) => setFormData({...formData, action_type: value})}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reassign_lead">Reassign Lead</SelectItem>
            <SelectItem value="create_task">Create Task</SelectItem>
            <SelectItem value="send_notification">Send Notification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.action_type === 'reassign_lead' && (
        <div>
          <Label htmlFor="reassign_agent" className="text-sm mb-1 block">Reassign To Agent *</Label>
          <Select value={formData.reassign_to_agent_email} onValueChange={(value) => setFormData({...formData, reassign_to_agent_email: value})}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.user_email}>
                  {agent.user_email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.action_type === 'create_task' && (
        <>
          <div>
            <Label htmlFor="task_title" className="text-sm mb-1 block">Task Title *</Label>
            <Input
              id="task_title"
              value={formData.task_title}
              onChange={(e) => setFormData({...formData, task_title: e.target.value})}
              placeholder="e.g., Follow up with hot lead"
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="task_description" className="text-sm mb-1 block">Task Description</Label>
            <Textarea
              id="task_description"
              value={formData.task_description}
              onChange={(e) => setFormData({...formData, task_description: e.target.value})}
              className="h-16"
            />
          </div>
          <div>
            <Label htmlFor="task_priority" className="text-sm mb-1 block">Priority</Label>
            <Select value={formData.task_priority} onValueChange={(value) => setFormData({...formData, task_priority: value})}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {formData.action_type === 'send_notification' && (
        <>
          <div>
            <Label htmlFor="notify_agent" className="text-sm mb-1 block">Notify Agent *</Label>
            <Select value={formData.notify_agent_email} onValueChange={(value) => setFormData({...formData, notify_agent_email: value})}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.user_email}>
                    {agent.user_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notification_message" className="text-sm mb-1 block">Message</Label>
            <Textarea
              id="notification_message"
              value={formData.notification_message}
              onChange={(e) => setFormData({...formData, notification_message: e.target.value})}
              placeholder="Notification message..."
              className="h-16"
            />
          </div>
        </>
      )}

      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? 'Saving...' : (rule?.id ? 'Update Rule' : 'Create Rule')}
      </Button>
    </form>
  );
}