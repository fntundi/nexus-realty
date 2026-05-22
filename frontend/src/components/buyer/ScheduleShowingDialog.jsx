import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function ScheduleShowingDialog({ open, onOpenChange, property, buyerEmail, transactionId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    proposed_date: '',
    proposed_time: '',
    duration_minutes: 60,
    notes: ''
  });

  const createShowingMutation = useMutation({
    mutationFn: async (data) => {
      // Combine date and time
      const proposedDateTime = new Date(`${data.proposed_date}T${data.proposed_time}`);
      
      return base44.entities.Showing.create({
        transaction_id: transactionId,
        property_id: property.id,
        buyer_email: buyerEmail,
        agent_email: transactionId ? undefined : property.listing_agent_email, // Will be assigned based on transaction
        proposed_date: proposedDateTime.toISOString(),
        duration_minutes: data.duration_minutes,
        notes: data.notes,
        status: 'proposed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['showings']);
      toast.success('Showing request sent! Your agent will confirm shortly.');
      onOpenChange(false);
      setFormData({
        proposed_date: '',
        proposed_time: '',
        duration_minutes: 60,
        notes: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to schedule showing. Please try again.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.proposed_date || !formData.proposed_time) {
      toast.error('Please select date and time');
      return;
    }
    createShowingMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a Showing</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="font-semibold text-slate-900">{property?.address}</div>
            <div className="text-sm text-slate-600">
              {property?.city}, {property?.state}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date
              </Label>
              <Input
                type="date"
                value={formData.proposed_date}
                onChange={(e) => setFormData({ ...formData, proposed_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </Label>
              <Input
                type="time"
                value={formData.proposed_time}
                onChange={(e) => setFormData({ ...formData, proposed_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
              min={15}
              step={15}
            />
          </div>

          <div className="space-y-2">
            <Label>Special Requests or Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special requests or things we should know?"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createShowingMutation.isPending}>
              {createShowingMutation.isPending ? 'Sending...' : 'Request Showing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}