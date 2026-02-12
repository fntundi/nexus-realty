import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function ScheduleTaskDialog({ contactId, contactEmail, transactionId, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'follow_up',
    priority: 'medium',
    due_date: '',
    due_time: '09:00',
    duration_minutes: 30,
    meeting_location: '',
    meeting_link: '',
    notes: ''
  });

  const user = base44.auth.me().then(u => u?.email);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const assignedEmail = await user;
      return base44.entities.Task.create({
        ...taskData,
        assigned_to_email: assignedEmail
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task scheduled successfully');
      setFormData({
        title: '',
        description: '',
        task_type: 'follow_up',
        priority: 'medium',
        due_date: '',
        due_time: '09:00',
        duration_minutes: 30,
        meeting_location: '',
        meeting_link: '',
        notes: ''
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Failed to schedule task: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.due_date) {
      toast.error('Please fill in required fields');
      return;
    }

    const dueDatetime = new Date(`${formData.due_date}T${formData.due_time}`);
    createTaskMutation.mutate({
      ...formData,
      due_date: dueDatetime.toISOString(),
      contact_id: contactId,
      contact_email: contactEmail,
      transaction_id: transactionId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Task Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Follow up call with John"
          required
        />
      </div>

      <div>
        <Label htmlFor="task_type">Task Type</Label>
        <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="due_time">Due Time</Label>
          <Input
            id="due_time"
            type="time"
            value={formData.due_time}
            onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
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
        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
            min="5"
          />
        </div>
      </div>

      {(formData.task_type === 'call' || formData.task_type === 'meeting') && (
        <>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.meeting_location}
              onChange={(e) => setFormData({ ...formData, meeting_location: e.target.value })}
              placeholder="Address or location"
            />
          </div>
          <div>
            <Label htmlFor="link">Meeting Link</Label>
            <Input
              id="link"
              value={formData.meeting_link}
              onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
              placeholder="https://zoom.us/j/..."
            />
          </div>
        </>
      )}

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Details about this task..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={createTaskMutation.isPending} className="flex-1">
          {createTaskMutation.isPending ? 'Scheduling...' : 'Schedule Task'}
        </Button>
      </div>
    </form>
  );
}