import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, Trash2, MessageSquare, PenTool, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const DOCUMENT_CATEGORIES = [
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'identification', label: 'Identification' },
  { value: 'property_details', label: 'Property Details' },
  { value: 'financial', label: 'Financial Documents' },
  { value: 'legal', label: 'Legal Documents' },
  { value: 'other', label: 'Other' }
];

export default function BorrowerDocumentPortal({ transactionId }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [documentNotes, setDocumentNotes] = useState({});
  const [documentCategories, setDocumentCategories] = useState({});
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
         category: documentCategories[file.name] || 'other',
         file_url,
         file_name: file.name,
         file_size: file.size,
         status: 'pending_review',
         uploaded_by_email: (await base44.auth.me()).email,
         uploaded_at: new Date().toISOString(),
         borrower_notes: documentNotes[file.name] || null,
         verification_status: 'pending',
         verified_at: null,
         verification_notes: null
       });

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploaded-documents', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['required-documents', transactionId] });
      setSelectedFiles([]);
      setDocumentNotes({});
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
              <div className="space-y-3">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{file.name}</span>
                      <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <textarea
                      placeholder="Add any notes about this document (optional)..."
                      value={documentNotes[file.name] || ''}
                      onChange={(e) => setDocumentNotes({
                        ...documentNotes,
                        [file.name]: e.target.value
                      })}
                      className="w-full text-xs p-2 border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows="2"
                    />
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
            <FileText className="w-5 h-5 text-slate-600" />
            Uploaded Documents ({uploadedDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedDocs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No documents uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {uploadedDocs.map(doc => {
                const getStatusColor = (status) => {
                  switch(status) {
                    case 'verified': return 'bg-green-50 border-green-200';
                    case 'pending': return 'bg-amber-50 border-amber-200';
                    case 'rejected': return 'bg-red-50 border-red-200';
                    default: return 'bg-slate-50 border-slate-200';
                  }
                };

                const getStatusIcon = (status) => {
                  switch(status) {
                    case 'verified': return <CheckCircle className="w-5 h-5 text-green-600" />;
                    case 'pending': return <Clock className="w-5 h-5 text-amber-600" />;
                    case 'rejected': return <AlertCircle className="w-5 h-5 text-red-600" />;
                    default: return <FileText className="w-5 h-5 text-slate-400" />;
                  }
                };

                return (
                  <div key={doc.id} className={`p-4 rounded-lg border ${getStatusColor(doc.verification_status || 'pending')}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(doc.verification_status || 'pending')}
                        <div>
                          <p className="font-semibold text-slate-900">{doc.file_name}</p>
                          <p className="text-xs text-slate-600">
                            Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          doc.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                          doc.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {doc.verification_status === 'verified' ? '✓ Verified' :
                           doc.verification_status === 'rejected' ? '✗ Rejected' :
                           '⏳ Under Review'}
                        </span>
                      </div>
                    </div>

                    {doc.borrower_notes && (
                      <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs text-slate-600 italic border-l-2 border-slate-300">
                        <p className="font-semibold mb-1">Your notes:</p>
                        {doc.borrower_notes}
                      </div>
                    )}

                    {doc.verification_notes && (
                      <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs text-slate-600 border-l-2 border-blue-300">
                        <p className="font-semibold mb-1">Lender feedback:</p>
                        {doc.verification_notes}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{doc.file_name}</DialogTitle>
                          </DialogHeader>
                          <div className="bg-slate-100 p-4 rounded-lg min-h-96 flex items-center justify-center">
                            <p className="text-slate-600">Document preview: {doc.file_url}</p>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {doc.verification_status !== 'verified' && doc.verification_status !== 'rejected' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDocSigningOpen(true);
                          }}
                        >
                          <PenTool className="w-3 h-3 mr-1" />
                          Sign
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digital Signature Dialog */}
      <Dialog open={docSigningOpen} onOpenChange={setDocSigningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                You're about to digitally sign <strong>{selectedDoc.file_name}</strong>
              </p>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <p className="text-slate-500 mb-4">Signature Area</p>
                <canvas 
                  id="signatureCanvas" 
                  className="w-full h-40 border border-slate-200 rounded cursor-crosshair bg-white"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDocSigningOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Complete Signature
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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