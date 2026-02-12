import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function InteractionLogger({ contactId, onSuccess }) {
  const [formData, setFormData] = useState({
    interaction_type: 'call',
    subject: '',
    description: '',
    interaction_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_minutes: '',
    outcome: 'follow_up_needed',
    next_step: '',
    follow_up_date: '',
    priority: 'medium'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Interaction.create({
      ...data,
      contact_id: contactId,
      conducted_by: (await base44.auth.me()).email
    }),
    onSuccess: () => {
      toast.success('Interaction logged successfully');
      setFormData({
        interaction_type: 'call',
        subject: '',
        description: '',
        interaction_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        duration_minutes: '',
        outcome: 'follow_up_needed',
        next_step: '',
        follow_up_date: '',
        priority: 'medium'
      });
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to log interaction');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.interaction_date) {
      toast.error('Subject and interaction date are required');
      return;
    }
    
    const user = await base44.auth.me();
    createMutation.mutate({
      ...formData,
      contact_id: contactId,
      conducted_by: user.email,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="interaction_type" className="text-sm mb-1 block">Type *</Label>
          <Select value={formData.interaction_type} onValueChange={(value) => setFormData({...formData, interaction_type: value})}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="note">Note</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="interaction_date" className="text-sm mb-1 block">Date & Time *</Label>
          <Input
            id="interaction_date"
            type="datetime-local"
            value={formData.interaction_date}
            onChange={(e) => setFormData({...formData, interaction_date: e.target.value})}
            className="h-8"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="subject" className="text-sm mb-1 block">Subject *</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData({...formData, subject: e.target.value})}
          placeholder="e.g., Initial consultation"
          className="h-8"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-sm mb-1 block">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Details of the interaction..."
          className="h-20"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="duration_minutes" className="text-sm mb-1 block">Duration (minutes)</Label>
          <Input
            id="duration_minutes"
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
            placeholder="30"
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="outcome" className="text-sm mb-1 block">Outcome</Label>
          <Select value={formData.outcome} onValueChange={(value) => setFormData({...formData, outcome: value})}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
              <SelectItem value="action_taken">Action Taken</SelectItem>
              <SelectItem value="no_action">No Action</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority" className="text-sm mb-1 block">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="next_step" className="text-sm mb-1 block">Next Step</Label>
          <Input
            id="next_step"
            value={formData.next_step}
            onChange={(e) => setFormData({...formData, next_step: e.target.value})}
            placeholder="Send proposal"
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="follow_up_date" className="text-sm mb-1 block">Follow-up Date</Label>
          <Input
            id="follow_up_date"
            type="date"
            value={formData.follow_up_date}
            onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
            className="h-8"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Logging...' : 'Log Interaction'}
      </Button>
    </form>
  );
}