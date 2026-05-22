import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSignature, Plus, Trash2, Calendar, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function EnhancedDocumentSigning({ document, transaction, onSignatureRequested }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signers, setSigners] = useState([
    { email: '', name: '', role: 'buyer', order: 1 }
  ]);
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState('');

  const requestSignatureMutation = useMutation({
    mutationFn: async (data) => {
      // Call DocuSign integration
      const response = await base44.functions.invoke('docusignSendEnvelope', {
        document_id: document.id,
        signers: data.signers,
        message: data.message,
        due_date: data.dueDate
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['documents']);
      toast.success('Signature request sent successfully');
      setDialogOpen(false);
      if (onSignatureRequested) onSignatureRequested(data);
    },
    onError: (error) => {
      toast.error('Failed to send signature request');
    }
  });

  const addSigner = () => {
    setSigners([...signers, { 
      email: '', 
      name: '', 
      role: 'other', 
      order: signers.length + 1 
    }]);
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
    // Validate
    if (signers.some(s => !s.email || !s.name)) {
      toast.error('Please fill in all signer details');
      return;
    }

    requestSignatureMutation.mutate({
      signers,
      message,
      dueDate
    });
  };

  const hasSignatureRequest = document?.signature_request?.docusign_envelope_id;

  return (
    <div className="space-y-4">
      {hasSignatureRequest ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              E-Signature Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Envelope ID:</span>
              <span className="text-sm font-mono">{document.signature_request.docusign_envelope_id}</span>
            </div>
            
            {document.signature_request.signers?.map((signer, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium">{signer.name}</div>
                  <div className="text-sm text-slate-600">{signer.email}</div>
                </div>
                <Badge className={
                  signer.status === 'signed' ? 'bg-green-100 text-green-800' :
                  signer.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {signer.status}
                </Badge>
              </div>
            ))}

            {document.signature_request.completion_date && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-semibold text-green-900">All Signatures Complete</div>
                <div className="text-sm text-green-700">
                  Completed on {new Date(document.signature_request.completion_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setDialogOpen(true)} className="w-full">
          <FileSignature className="w-4 h-4 mr-2" />
          Request E-Signatures
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request E-Signatures</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="font-semibold text-slate-900">{document?.file_name}</div>
              <div className="text-sm text-slate-600">Document will be sent for signature</div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Signers</Label>
                <Button size="sm" variant="outline" onClick={addSigner}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Signer
                </Button>
              </div>

              {signers.map((signer, index) => (
                <Card key={index}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Signer {index + 1}</span>
                      {signers.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSigner(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={signer.name}
                          onChange={(e) => updateSigner(index, 'name', e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={signer.email}
                          onChange={(e) => updateSigner(index, 'email', e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Role</Label>
                        <Select
                          value={signer.role}
                          onValueChange={(val) => updateSigner(index, 'role', val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="buyer">Buyer</SelectItem>
                            <SelectItem value="lender">Lender</SelectItem>
                            <SelectItem value="seller">Seller</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Signing Order</Label>
                        <Input
                          type="number"
                          value={signer.order}
                          onChange={(e) => updateSigner(index, 'order', Number(e.target.value))}
                          min={1}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label>Message to Signers</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional message to include with the signature request..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={requestSignatureMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {requestSignatureMutation.isPending ? 'Sending...' : 'Send for Signature'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}