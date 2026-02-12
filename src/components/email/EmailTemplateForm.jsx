import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

const AVAILABLE_VARIABLES = [
  'first_name', 'last_name', 'email', 'company', 
  'lead_score', 'contact_type', 'status'
];

export default function EmailTemplateForm({ template, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(template || {
    name: '',
    subject: '',
    body: '',
    variables: AVAILABLE_VARIABLES
  });

  const mutation = useMutation({
    mutationFn: (data) => 
      template?.id 
        ? base44.entities.EmailTemplate.update(template.id, data)
        : base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      onSuccess?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template ? 'Edit' : 'Create'} Email Template</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hot Lead Welcome"
              required
            />
          </div>

          <div>
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Hello {{first_name}}, welcome!"
              required
            />
          </div>

          <div>
            <Label htmlFor="body">Email Body (HTML)</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="<p>Hi {{first_name}},</p><p>Your lead score is {{lead_score}}</p>"
              className="h-48 font-mono text-sm"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Available Variables:</p>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_VARIABLES.map(v => (
                    <code key={v} className="bg-white px-2 py-1 rounded">
                      {'{{'}{v}{'}}'}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}