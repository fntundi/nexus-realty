import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Trash2, Download, Plus, Eye } from 'lucide-react';

export default function SharedDocuments({ transactionId, userEmail }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['dealDocuments', transactionId],
    queryFn: async () => {
      const docs = await base44.entities.Document.filter({ transaction_id: transactionId });
      return docs || [];
    },
    enabled: !!transactionId
  });

  const uploadMutation = useMutation({
    mutationFn: async (fileData) => {
      const uploadResult = await base44.integrations.Core.UploadFile({ file: fileData });
      return base44.entities.Document.create({
        transaction_id: transactionId,
        document_type: 'shared_document',
        category: 'other',
        file_url: uploadResult.file_url,
        file_name: fileData.name,
        uploaded_by: userEmail,
        access_control: {
          visible_to_agent: true,
          visible_to_buyer: true,
          visible_to_lender: true,
          visible_to_builder: true
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealDocuments'] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => base44.entities.Document.delete(docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dealDocuments'] })
  });

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files?.[0]);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Shared Documents</CardTitle>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-3 h-3" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <input
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm border rounded p-2"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.file_name}</p>
                    <p className="text-xs text-slate-500">by {doc.uploaded_by}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {doc.category}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    className="gap-1"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDocMutation.mutate(doc.id)}
                    disabled={deleteDocMutation.isPending}
                    className="gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 text-sm py-6">No documents uploaded yet</p>
        )}
      </CardContent>
    </Card>
  );
}