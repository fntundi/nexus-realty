import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SMSThread({ lead, open, onClose }) {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['sms-thread', lead?.id],
    queryFn: () => base44.entities.Interaction.filter(
      { contact_id: lead?.id, interaction_type: 'sms' },
      'interaction_date'
    ),
    enabled: !!lead?.id && open
  });

  const sendMutation = useMutation({
    mutationFn: async (text) => {
      await base44.functions.invoke('sendSMS', {
        to_number: lead.phone,
        message: text,
        lead_id: lead.id
      });
      await base44.entities.Interaction.create({
        contact_id: lead.id,
        interaction_type: 'sms',
        subject: 'SMS',
        description: text,
        conducted_by: 'agent',
        interaction_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries(['sms-thread', lead?.id]);
    },
    onError: () => toast.error('SMS not configured — Twilio credentials required.')
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
      e.preventDefault();
      sendMutation.mutate(message.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md flex flex-col" style={{ height: '480px' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Text {lead?.first_name} {lead?.last_name}
          </DialogTitle>
          <p className="text-sm text-slate-500">{lead?.phone || 'No phone on file'}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2 min-h-0">
          {messages.length === 0 && (
            <p className="text-center text-slate-400 text-sm mt-10">No messages yet. Send the first one!</p>
          )}
          {messages.map(msg => (
            <div key={msg.id} className="flex justify-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-3 py-2 max-w-xs">
                <p className="text-sm">{msg.description}</p>
                <p className="text-xs text-blue-200 mt-1">
                  {format(new Date(msg.interaction_date), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="resize-none h-10 py-2 min-h-0"
          />
          <Button
            onClick={() => sendMutation.mutate(message.trim())}
            disabled={!message.trim() || sendMutation.isPending || !lead?.phone}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}