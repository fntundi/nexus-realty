import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentFeedbackForm({ transaction, agent, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState({
    overall: 0,
    communication: 0,
    expertise: 0,
    professionalism: 0
  });
  const [wouldRecommend, setWouldRecommend] = useState(false);
  const [comments, setComments] = useState('');

  const submitFeedbackMutation = useMutation({
    mutationFn: () =>
      base44.entities.AgentFeedback.create({
        transaction_id: transaction.id,
        client_email: transaction.buyer_email,
        agent_id: agent.id,
        agent_email: agent.user_email,
        overall_rating: ratings.overall,
        communication_rating: ratings.communication,
        expertise_rating: ratings.expertise,
        professionalism_rating: ratings.professionalism,
        would_recommend: wouldRecommend,
        comments,
        property_address: transaction.property_id,
        feedback_date: new Date().toISOString()
      }),
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      setOpen(false);
      setRatings({ overall: 0, communication: 0, expertise: 0, professionalism: 0 });
      setWouldRecommend(false);
      setComments('');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    }
  });

  const StarRating = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="transition"
          >
            <Star
              className={`w-6 h-6 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-600">
        {value > 0 ? `${value}/5 stars` : 'Not rated'}
      </p>
    </div>
  );

  const isComplete = ratings.overall > 0 && ratings.communication > 0 && 
                     ratings.expertise > 0 && ratings.professionalism > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Share Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Agent</DialogTitle>
          <DialogDescription>
            Your honest feedback helps us improve our service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <StarRating
            value={ratings.overall}
            onChange={(val) => setRatings({ ...ratings, overall: val })}
            label="Overall Experience"
          />

          <StarRating
            value={ratings.communication}
            onChange={(val) => setRatings({ ...ratings, communication: val })}
            label="Communication"
          />

          <StarRating
            value={ratings.expertise}
            onChange={(val) => setRatings({ ...ratings, expertise: val })}
            label="Expertise & Knowledge"
          />

          <StarRating
            value={ratings.professionalism}
            onChange={(val) => setRatings({ ...ratings, professionalism: val })}
            label="Professionalism"
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="recommend"
              checked={wouldRecommend}
              onCheckedChange={setWouldRecommend}
            />
            <Label htmlFor="recommend" className="text-sm font-normal cursor-pointer">
              I would recommend this agent to friends
            </Label>
          </div>

          <div>
            <Label htmlFor="comments" className="text-sm font-medium mb-2 block">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="comments"
              placeholder="Share your experience..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitFeedbackMutation.mutate()}
              disabled={!isComplete || submitFeedbackMutation.isPending}
              className="flex-1"
            >
              {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}