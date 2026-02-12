import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ShowingScheduler({ transaction, currentUser, userRole }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);
  const [selectedShowing, setSelectedShowing] = useState(null);
  const [formData, setFormData] = useState({
    proposed_date: '',
    duration_minutes: 60,
    notes: '',
    location: ''
  });
  const [counterDate, setCounterDate] = useState('');
  const [counterNotes, setCounterNotes] = useState('');

  const queryClient = useQueryClient();

  const { data: showings = [] } = useQuery({
    queryKey: ['showings', transaction.id],
    queryFn: () => base44.entities.Showing.filter({ transaction_id: transaction.id }, '-created_date')
  });

  const { data: property } = useQuery({
    queryKey: ['property', transaction.property_id],
    queryFn: () => base44.entities.Property.filter({ id: transaction.property_id }),
    select: (data) => data[0],
    enabled: !!transaction.property_id
  });

  const createShowingMutation = useMutation({
    mutationFn: (data) => base44.entities.Showing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showings'] });
      setDialogOpen(false);
      setFormData({ proposed_date: '', duration_minutes: 60, notes: '', location: '' });
      toast.success('Showing scheduled!');
      
      // Send notification to buyer
      base44.integrations.Core.SendEmail({
        to: transaction.buyer_email,
        subject: 'New Showing Scheduled',
        body: `Your agent has proposed a showing for ${property?.address || 'your property'}. Please check your portal to accept or propose an alternative time.`
      });
    }
  });

  const updateShowingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Showing.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['showings'] });
      setCounterDialogOpen(false);
      setSelectedShowing(null);
      setCounterDate('');
      setCounterNotes('');
      
      if (variables.data.status === 'accepted') {
        toast.success('Showing confirmed!');
        // Notify agent
        base44.integrations.Core.SendEmail({
          to: transaction.agent_id,
          subject: 'Showing Accepted',
          body: `The buyer has accepted the showing for ${property?.address || 'the property'} on ${format(new Date(variables.data.proposed_date), 'PPpp')}.`
        });
      } else if (variables.data.counter_proposals) {
        toast.success('Alternative time proposed!');
        // Notify agent
        base44.integrations.Core.SendEmail({
          to: transaction.agent_id,
          subject: 'Alternative Time Proposed',
          body: `The buyer has proposed an alternative time for the showing at ${property?.address || 'the property'}.`
        });
      }
    }
  });

  const handleCreateShowing = () => {
    if (!formData.proposed_date) {
      toast.error('Please select a date and time');
      return;
    }

    createShowingMutation.mutate({
      transaction_id: transaction.id,
      property_id: transaction.property_id,
      agent_email: currentUser.email,
      buyer_email: transaction.buyer_email,
      proposed_date: formData.proposed_date,
      duration_minutes: formData.duration_minutes,
      notes: formData.notes,
      location: formData.location || property?.address || '',
      status: 'proposed'
    });
  };

  const handleAccept = (showing) => {
    updateShowingMutation.mutate({
      id: showing.id,
      data: {
        status: 'accepted',
        accepted_date: new Date().toISOString()
      }
    });
  };

  const handleDecline = (showing) => {
    updateShowingMutation.mutate({
      id: showing.id,
      data: { status: 'declined' }
    });
  };

  const handleCounterPropose = () => {
    if (!counterDate) {
      toast.error('Please select a date and time');
      return;
    }

    const counterProposals = selectedShowing.counter_proposals || [];
    counterProposals.push({
      proposed_by: currentUser.email,
      proposed_date: counterDate,
      notes: counterNotes,
      created_date: new Date().toISOString()
    });

    updateShowingMutation.mutate({
      id: selectedShowing.id,
      data: { counter_proposals: counterProposals }
    });
  };

  const handleAcceptCounter = (showing, counterDate) => {
    updateShowingMutation.mutate({
      id: showing.id,
      data: {
        proposed_date: counterDate,
        status: 'accepted',
        accepted_date: new Date().toISOString()
      }
    });
  };

  const handleComplete = (showing) => {
    updateShowingMutation.mutate({
      id: showing.id,
      data: {
        status: 'completed',
        completed_date: new Date().toISOString()
      }
    });
  };

  const statusColors = {
    proposed: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Showings</h3>
        {userRole === 'agent' && (
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Showing
          </Button>
        )}
      </div>

      {showings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No showings scheduled yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {showings.map(showing => (
            <Card key={showing.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[showing.status]}>
                        {showing.status}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {showing.counter_proposals?.length > 0 && 
                          `${showing.counter_proposals.length} counter proposal(s)`
                        }
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">
                          {format(new Date(showing.proposed_date), 'PPpp')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{showing.duration_minutes} minutes</span>
                      </div>
                      
                      {showing.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{showing.location}</span>
                        </div>
                      )}
                      
                      {showing.notes && (
                        <div className="text-slate-600 mt-2 p-2 bg-slate-50 rounded">
                          {showing.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {userRole === 'buyer' && showing.status === 'proposed' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(showing)}
                          disabled={updateShowingMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedShowing(showing);
                            setCounterDialogOpen(true);
                          }}
                        >
                          Propose Alternative
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDecline(showing)}
                          disabled={updateShowingMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </>
                    )}
                    
                    {userRole === 'agent' && showing.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleComplete(showing)}
                        disabled={updateShowingMutation.isPending}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>

                {/* Counter Proposals */}
                {showing.counter_proposals?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-sm font-medium text-slate-700 mb-2">Alternative Times:</div>
                    <div className="space-y-2">
                      {showing.counter_proposals.map((counter, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div>
                            <div className="font-medium text-sm">
                              {format(new Date(counter.proposed_date), 'PPpp')}
                            </div>
                            {counter.notes && (
                              <div className="text-xs text-slate-600 mt-1">{counter.notes}</div>
                            )}
                          </div>
                          {userRole === 'agent' && showing.status === 'proposed' && (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptCounter(showing, counter.proposed_date)}
                              disabled={updateShowingMutation.isPending}
                            >
                              Accept This Time
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Showing Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Showing</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date & Time</label>
              <Input
                type="datetime-local"
                value={formData.proposed_date}
                onChange={(e) => setFormData({ ...formData, proposed_date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input
                placeholder="Meeting location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="Additional instructions or notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateShowing}
              disabled={createShowingMutation.isPending}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter Proposal Dialog */}
      <Dialog open={counterDialogOpen} onOpenChange={setCounterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose Alternative Time</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Alternative Date & Time</label>
              <Input
                type="datetime-local"
                value={counterDate}
                onChange={(e) => setCounterDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
              <Textarea
                placeholder="Reason for alternative time..."
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCounterPropose}
              disabled={updateShowingMutation.isPending}
            >
              Propose
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}