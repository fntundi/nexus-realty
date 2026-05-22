import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function CallDialer({ lead, open, onClose }) {
  const [callState, setCallState] = useState('idle'); // idle | calling | connected
  const [muted, setMuted] = useState(false);

  const handleCall = async () => {
    if (!lead?.phone) return;
    setCallState('calling');
    try {
      await base44.functions.invoke('makeCall', {
        to_number: lead.phone,
        lead_id: lead.id,
        lead_name: `${lead.first_name} ${lead.last_name}`
      });
      setCallState('connected');
    } catch {
      toast.error('Calling not configured — Twilio credentials required.');
      setCallState('idle');
    }
  };

  const handleHangup = () => {
    setCallState('idle');
    onClose();
  };

  const initials = `${lead?.first_name?.[0] ?? ''}${lead?.last_name?.[0] ?? ''}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-600" />
            Call {lead?.first_name} {lead?.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-slate-600">{initials}</span>
            </div>
            <p className="font-semibold text-lg">{lead?.first_name} {lead?.last_name}</p>
            <p className="text-slate-500 text-sm">{lead?.phone || 'No phone on file'}</p>
          </div>

          {callState === 'idle' && (
            <Button
              onClick={handleCall}
              disabled={!lead?.phone}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 p-0"
            >
              <Phone className="w-6 h-6" />
            </Button>
          )}

          {callState === 'calling' && (
            <div className="text-center space-y-4">
              <p className="text-slate-500 animate-pulse text-sm">Calling...</p>
              <Button onClick={handleHangup} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 p-0">
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          )}

          {callState === 'connected' && (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-medium text-sm">Connected</p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => setMuted(!muted)} className="w-12 h-12 rounded-full p-0">
                  {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button onClick={handleHangup} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 p-0">
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}