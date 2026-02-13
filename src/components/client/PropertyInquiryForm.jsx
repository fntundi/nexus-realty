import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function PropertyInquiryForm({ contactId, agentEmail, propertyId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: 'inquiry',
    property_id: propertyId || '',
    subject: '',
    message: ''
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      // Create interaction
      await base44.entities.Interaction.create({
        contact_id: contactId,
        interaction_type: data.type === 'feedback' ? 'note' : 'email',
        subject: data.subject,
        description: data.message,
        conducted_by: agentEmail,
        interaction_date: new Date().toISOString(),
        outcome: 'follow_up_needed',
        priority: 'medium'
      });

      // Send notification to agent
      if (agentEmail) {
        await base44.integrations.Core.SendEmail({
          to: agentEmail,
          subject: `Client ${data.type}: ${data.subject}`,
          body: `You have a new ${data.type} from your client.\n\n${data.message}\n\nProperty ID: ${data.property_id || 'N/A'}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['interactions']);
      toast.success('Your message has been sent to your agent');
      setFormData({
        type: 'inquiry',
        property_id: propertyId || '',
        subject: '',
        message: ''
      });
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Send Message to Your Agent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Message Type</Label>
            <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">Property Inquiry</SelectItem>
                <SelectItem value="feedback">General Feedback</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="issue">Report Issue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="What's this about?"
              required
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Tell us more..."
              rows={5}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
            <Send className="w-4 h-4 mr-2" />
            {submitMutation.isPending ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}