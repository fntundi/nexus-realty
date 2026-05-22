import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Share2, Lock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function BuyerDocumentManagement({ transaction, documents = [] }) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [shareWith, setShareWith] = useState('');
  const [shareRole, setShareRole] = useState('lender');
  const [shareName, setShareName] = useState('');

  const queryClient = useQueryClient();

  const { data: documentShares = [] } = useQuery({
    queryKey: ['document-shares', transaction?.id],
    queryFn: () => base44.entities.BuyerDocumentShare.filter(
      { transaction_id: transaction?.id },
      '-share_date'
    ),
    enabled: !!transaction?.id
  });

  const shareDocMutation = useMutation({
    mutationFn: (data) => base44.entities.BuyerDocumentShare.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-shares'] });
      setShareDialogOpen(false);
      setShareWith('');
      setShareRole('lender');
      setShareName('');
      toast.success('Document shared successfully');
    }
  });

  const updateShareMutation = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.BuyerDocumentShare.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-shares'] });
      toast.success('Share updated');
    }
  });

  const handleShareDocument = () => {
    if (!shareWith || !shareName || !selectedDoc) {
      toast.error('Please fill in all fields');
      return;
    }

    shareDocMutation.mutate({
      document_id: selectedDoc.id,
      shared_by_email: transaction?.buyer_email,
      shared_with_email: shareWith,
      shared_with_name: shareName,
      shared_with_role: shareRole,
      transaction_id: transaction?.id,
      access_level: 'review'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'signed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'signed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Document List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Offer Documents</h3>
          <span className="text-sm text-slate-600">{documents.length} documents</span>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No documents uploaded yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{doc.file_name}</p>
                        <p className="text-xs text-slate-500">{doc.document_type}</p>
                      </div>
                    </div>

                    <Dialog open={shareDialogOpen && selectedDoc?.id === doc.id} onOpenChange={setShareDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Share Document</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Recipient Role</Label>
                            <Select value={shareRole} onValueChange={setShareRole}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lender">Lender</SelectItem>
                                <SelectItem value="attorney">Attorney</SelectItem>
                                <SelectItem value="inspector">Inspector</SelectItem>
                                <SelectItem value="appraiser">Appraiser</SelectItem>
                                <SelectItem value="title_company">Title Company</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Recipient Name</Label>
                            <Input
                              value={shareName}
                              onChange={(e) => setShareName(e.target.value)}
                              placeholder="e.g., Jane Smith (XYZ Bank)"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Recipient Email</Label>
                            <Input
                              type="email"
                              value={shareWith}
                              onChange={(e) => setShareWith(e.target.value)}
                              placeholder="recipient@example.com"
                            />
                          </div>

                          <p className="text-xs text-slate-600">
                            Recipient will need to approve before they can access the document.
                          </p>

                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={handleShareDocument}
                              disabled={shareDocMutation.isPending}
                            >
                              {shareDocMutation.isPending ? 'Sharing...' : 'Share Document'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Shares Status */}
      {documentShares.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Shared With</h3>
          <div className="space-y-2">
            {documentShares.map((share) => (
              <Card key={share.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{share.shared_with_name}</p>
                      <p className="text-sm text-slate-600">{share.shared_with_email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {share.shared_with_role.replace(/_/g, ' ')} • Shared {new Date(share.share_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(share.approval_status)}>
                        {getStatusIcon(share.approval_status)}
                        <span className="ml-1">{share.approval_status}</span>
                      </Badge>
                    </div>
                  </div>

                  {share.approval_notes && (
                    <p className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 rounded">
                      {share.approval_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}