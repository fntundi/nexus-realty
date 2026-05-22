import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Upload, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ClientDocumentSection({ transactionId, userEmail }) {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', transactionId],
    queryFn: () => base44.entities.Document.filter({ transaction_id: transactionId }),
    enabled: !!transactionId
  });

  const visibleDocs = documents.filter(d => d.access_control?.visible_to_buyer !== false);
  const pendingSignature = visibleDocs.filter(d => 
    d.signature_request?.signers?.some(s => s.email === userEmail && s.status === 'sent')
  );

  const handleDownload = (doc) => {
    window.open(doc.file_url, '_blank');
  };

  const handleSign = (doc) => {
    if (doc.signature_request?.docusign_envelope_id) {
      // Open DocuSign signing interface
      toast.info('Opening signature interface...');
      // In production, this would redirect to DocuSign
      window.open(doc.signature_request.signing_url || '#', '_blank');
    }
  };

  const getStatusBadge = (doc) => {
    if (doc.signature_request) {
      const userSigner = doc.signature_request.signers?.find(s => s.email === userEmail);
      if (userSigner?.status === 'signed') {
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Signed</Badge>;
      }
      if (userSigner?.status === 'sent') {
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" />Awaiting Signature</Badge>;
      }
    }
    return <Badge className="bg-blue-100 text-blue-800">{doc.status?.replace(/_/g, ' ')}</Badge>;
  };

  if (!transactionId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No active transaction</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents & Signatures
          </CardTitle>
          {pendingSignature.length > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {pendingSignature.length} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pendingSignature.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Action Required</p>
                <p className="text-sm text-amber-700 mt-1">
                  You have {pendingSignature.length} document(s) awaiting your signature
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {visibleDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No documents yet</p>
            </div>
          ) : (
            visibleDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{doc.file_name || doc.document_type}</div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(doc.upload_date || doc.created_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  {getStatusBadge(doc)}
                </div>
                <div className="flex gap-2 ml-4">
                  {doc.signature_request?.signers?.some(s => s.email === userEmail && s.status === 'sent') ? (
                    <Button size="sm" onClick={() => handleSign(doc)}>
                      Sign Now
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}