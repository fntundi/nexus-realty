import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileUp, File, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientDocumentUpload({ transactionId, userEmail, documents }) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      try {
        // Upload file to storage
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Create document record
        await base44.entities.Document.create({
          transaction_id: transactionId,
          document_type: 'client_upload',
          category: 'other',
          file_url,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: userEmail,
          upload_date: new Date().toISOString(),
          status: 'pending_review',
          access_control: {
            visible_to_agent: true,
            visible_to_buyer: true,
            visible_to_lender: false,
            visible_to_builder: true
          }
        });

        return true;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload document');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.Document.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File too large (max 50MB)');
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const clientDocs = documents?.filter(d => d.document_type === 'client_upload') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="w-5 h-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition">
          <Input
            type="file"
            onChange={handleFileSelect}
            disabled={uploading || uploadMutation.isPending}
            className="hidden"
            id="file-upload"
          />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <FileUp className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="font-medium text-slate-900">
              {uploading || uploadMutation.isPending ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG (max 50MB)</p>
          </Label>
        </div>

        {clientDocs.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3">Your Documents ({clientDocs.length})</h4>
            <div className="space-y-2">
              {clientDocs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                      <p className="text-xs text-slate-500">
                        {(doc.file_size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {doc.status === 'pending_review' ? 'Pending' : doc.status}
                    </Badge>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{doc.file_name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(doc.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}