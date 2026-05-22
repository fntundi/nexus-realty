import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PenTool, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SignatureRequest({ document, open, onOpenChange, transaction, currentUser }) {
  const [signers, setSigners] = useState([
    { email: transaction.buyer_email, name: '', role: 'buyer', order: 1 }
  ]);
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState('');

  const queryClient = useQueryClient();

  // Check DocuSign configuration
  const { data: config } = useQuery({
    queryKey: ['docusign-config'],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: 'docusign_settings' });
      return configs[0]?.config_value || { enabled: false };
    }
  });

  const sendSignatureMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('docusignSendEnvelope', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onOpenChange(false);
      toast.success('Document sent for signature!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to send for signature');
    }
  });

  const addSigner = () => {
    setSigners([
      ...signers,
      { email: '', name: '', role: 'other', order: signers.length + 1 }
    ]);
  };

  const removeSigner = (index) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index, field, value) => {
    const updated = [...signers];
    updated[index][field] = value;
    setSigners(updated);
  };

  const handleSubmit = () => {
    const invalidSigner = signers.find(s => !s.email || !s.name);
    if (invalidSigner) {
      toast.error('Please fill in all signer details');
      return;
    }

    sendSignatureMutation.mutate({
      document_id: document.id,
      document_url: document.file_url,
      file_name: document.file_name,
      signers: signers,
      message: message,
      due_date: dueDate || null
    });
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send for E-Signature</DialogTitle>
          <p className="text-sm text-slate-600">
            Document: {document?.file_name}
          </p>
        </DialogHeader>

        {!config.enabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              DocuSign integration is not enabled. Please contact your administrator to enable e-signatures.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label>Message to Signers (optional)</Label>
            <Textarea
              placeholder="Add a message for the signers..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              disabled={!config.enabled}
            />
          </div>

          <div>
            <Label>Due Date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!config.enabled}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Signers</Label>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={addSigner}
                disabled={!config.enabled}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Signer
              </Button>
            </div>

            {signers.map((signer, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Signer {index + 1}</span>
                  {signers.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSigner(index)}
                      disabled={!config.enabled}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      placeholder="email@example.com"
                      value={signer.email}
                      onChange={(e) => updateSigner(index, 'email', e.target.value)}
                      disabled={!config.enabled}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={signer.name}
                      onChange={(e) => updateSigner(index, 'name', e.target.value)}
                      disabled={!config.enabled}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Role</Label>
                    <Select
                      value={signer.role}
                      onValueChange={(value) => updateSigner(index, 'role', value)}
                      disabled={!config.enabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="lender">Lender</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Signing Order</Label>
                    <Input
                      type="number"
                      min="1"
                      value={signer.order}
                      onChange={(e) => updateSigner(index, 'order', parseInt(e.target.value))}
                      disabled={!config.enabled}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!config.enabled || sendSignatureMutation.isPending}
          >
            {sendSignatureMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <PenTool className="w-4 h-4 mr-2" />
                Send for Signature
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}