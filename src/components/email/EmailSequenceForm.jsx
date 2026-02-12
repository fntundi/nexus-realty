import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

export default function EmailSequenceForm({ sequence, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(sequence || {
    name: '',
    description: '',
    trigger_type: 'lead_score_threshold',
    trigger_value: '75',
    emails: []
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list('-created_date', 50)
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      sequence?.id
        ? base44.entities.EmailSequence.update(sequence.id, data)
        : base44.entities.EmailSequence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSequences'] });
      onSuccess?.();
    }
  });

  const handleAddEmail = () => {
    setFormData({
      ...formData,
      emails: [...formData.emails, { order: formData.emails.length + 1, template_id: '', delay_hours: 0 }]
    });
  };

  const handleRemoveEmail = (index) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter((_, i) => i !== index)
    });
  };

  const handleEmailChange = (index, field, value) => {
    const newEmails = [...formData.emails];
    newEmails[index] = { ...newEmails[index], [field]: value };
    setFormData({ ...formData, emails: newEmails });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{sequence ? 'Edit' : 'Create'} Email Sequence</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Sequence Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hot Lead Nurture"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this sequence for?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trigger">Trigger Type</Label>
              <Select value={formData.trigger_type} onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_score_threshold">Lead Score Threshold</SelectItem>
                  <SelectItem value="status_change">Status Change</SelectItem>
                  <SelectItem value="manual">Manual Trigger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trigger_value">Trigger Value</Label>
              {formData.trigger_type === 'lead_score_threshold' ? (
                <Input
                  id="trigger_value"
                  type="number"
                  value={formData.trigger_value}
                  onChange={(e) => setFormData({ ...formData, trigger_value: e.target.value })}
                  placeholder="e.g., 75"
                  min="0"
                  max="100"
                />
              ) : (
                <Select value={formData.trigger_value} onValueChange={(value) => setFormData({ ...formData, trigger_value: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Emails in Sequence</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddEmail}>
                <Plus className="w-4 h-4 mr-2" />
                Add Email
              </Button>
            </div>

            <div className="space-y-3">
              {formData.emails.map((email, idx) => (
                <div key={idx} className="flex gap-3 items-end p-3 bg-slate-50 rounded-lg border">
                  <div className="flex-1">
                    <Label className="text-xs">Template</Label>
                    <Select value={email.template_id} onValueChange={(value) => handleEmailChange(idx, 'template_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Delay (hours)</Label>
                    <Input
                      type="number"
                      value={email.delay_hours}
                      onChange={(e) => handleEmailChange(idx, 'delay_hours', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEmail(idx)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Sequence'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}