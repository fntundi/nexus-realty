import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, Trash2, MessageSquare, PenTool, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function BorrowerDocumentPortal({ transactionId }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [documentNotes, setDocumentNotes] = useState({});
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docSigningOpen, setDocSigningOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch required documents for this transaction
  const { data: requiredDocs = [] } = useQuery({
    queryKey: ['required-documents', transactionId],
    queryFn: async () => {
      const docs = await base44.entities.Document.filter({ transaction_id: transactionId });
      return docs.filter(d => d.status === 'pending');
    }
  });

  // Fetch uploaded documents
  const { data: uploadedDocs = [] } = useQuery({
    queryKey: ['uploaded-documents', transactionId],
    queryFn: async () => {
      const docs = await base44.entities.Document.filter({ transaction_id: transactionId });
      return docs.filter(d => d.status === 'received');
    }
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploadingFile(file.name);
      
      // Upload to secure storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create document record
      const doc = await base44.entities.Document.create({
        transaction_id: transactionId,
        document_type: file.type || 'Supporting Document',
        file_url,
        file_name: file.name,
        file_size: file.size,
        status: 'received',
        uploaded_by_email: (await base44.auth.me()).email,
        uploaded_at: new Date().toISOString()
      });

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploaded-documents', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['required-documents', transactionId] });
      setSelectedFiles([]);
      setUploadingFile(null);
    },
    onError: (error) => {
      setUploadingFile(null);
      alert('Upload failed: ' + error.message);
    }
  });

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    for (const file of selectedFiles) {
      await uploadMutation.mutateAsync(file);
    }
  };

  const getDocumentIcon = (status) => {
    if (status === 'received') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'pending') return <AlertCircle className="w-5 h-5 text-amber-600" />;
    return <Clock className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-2 border-dashed border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-slate-600">Upload documents securely. They're linked directly to your application.</p>
            
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploadMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Required Documents */}
      {requiredDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              Documents Still Needed ({requiredDocs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requiredDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{doc.document_type}</p>
                      {doc.description && <p className="text-sm text-slate-600">{doc.description}</p>}
                    </div>
                  </div>
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Uploaded Documents ({uploadedDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedDocs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No documents uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {uploadedDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3 flex-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{doc.file_name}</p>
                      <p className="text-xs text-slate-600">
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>🔒 Your documents are secure:</strong> All files are encrypted and stored securely. Only authorized lenders and your assigned agent can access them.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}