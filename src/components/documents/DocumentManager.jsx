import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Plus, Eye, Download, History, Trash2 } from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import DocumentCard from './DocumentCard';
import DocumentPreview from './DocumentPreview';

export default function DocumentManager({ transaction, currentUser, userRole }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewDocument, setPreviewDocument] = useState(null);

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', transaction.id],
    queryFn: () => base44.entities.Document.filter({ transaction_id: transaction.id }, '-upload_date')
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId) => base44.entities.Document.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  // Filter documents based on role access
  const accessibleDocuments = documents.filter(doc => {
    if (!doc.access_control) return true;
    const roleKey = `visible_to_${userRole}`;
    return doc.access_control[roleKey] !== false;
  });

  // Further filter by stage and category
  const filteredDocuments = accessibleDocuments.filter(doc => {
    const stageMatch = selectedStage === 'all' || doc.stage === selectedStage;
    const categoryMatch = selectedCategory === 'all' || doc.category === selectedCategory;
    return stageMatch && categoryMatch;
  });

  // Group documents by stage
  const documentsByStage = {
    all: filteredDocuments,
    pre_qual: filteredDocuments.filter(d => d.stage === 'pre_qual'),
    showing: filteredDocuments.filter(d => d.stage === 'showing'),
    offer: filteredDocuments.filter(d => d.stage === 'offer'),
    under_contract: filteredDocuments.filter(d => d.stage === 'under_contract'),
    closing: filteredDocuments.filter(d => d.stage === 'closing')
  };

  const stages = [
    { value: 'all', label: 'All Stages' },
    { value: 'pre_qual', label: 'Pre-Qualification' },
    { value: 'showing', label: 'Showing' },
    { value: 'offer', label: 'Offer' },
    { value: 'under_contract', label: 'Under Contract' },
    { value: 'closing', label: 'Closing' }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'contract', label: 'Contracts' },
    { value: 'disclosure', label: 'Disclosures' },
    { value: 'inspection', label: 'Inspections' },
    { value: 'appraisal', label: 'Appraisals' },
    { value: 'loan', label: 'Loan Documents' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'closing', label: 'Closing Documents' },
    { value: 'other', label: 'Other' }
  ];

  const handleApprove = (docId) => {
    updateDocumentMutation.mutate({
      id: docId,
      data: { status: 'approved' }
    });
  };

  const handleReject = (docId) => {
    updateDocumentMutation.mutate({
      id: docId,
      data: { status: 'rejected' }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Button onClick={() => setUploadDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Tabs value={selectedStage} onValueChange={setSelectedStage} className="w-full">
          <TabsList className="grid grid-cols-6 w-full">
            {stages.map(stage => (
              <TabsTrigger key={stage.value} value={stage.value} className="text-xs">
                {stage.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat.value}
            size="sm"
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{filteredDocuments.length}</div>
            <div className="text-xs text-slate-600">Total Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredDocuments.filter(d => d.status === 'pending_review').length}
            </div>
            <div className="text-xs text-slate-600">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredDocuments.filter(d => d.status === 'approved').length}
            </div>
            <div className="text-xs text-slate-600">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {filteredDocuments.filter(d => d.version > 1).length}
            </div>
            <div className="text-xs text-slate-600">Versioned</div>
          </CardContent>
        </Card>
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No documents found</p>
            <p className="text-sm mt-2">Upload your first document to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredDocuments.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              userRole={userRole}
              onPreview={() => setPreviewDocument(doc)}
              onApprove={() => handleApprove(doc.id)}
              onReject={() => handleReject(doc.id)}
              onDelete={() => deleteDocumentMutation.mutate(doc.id)}
            />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <DocumentUpload
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        transaction={transaction}
        currentUser={currentUser}
        userRole={userRole}
      />

      {/* Preview Dialog */}
      <DocumentPreview
        document={previewDocument}
        open={!!previewDocument}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        onNewVersion={() => {
          setPreviewDocument(null);
          setUploadDialogOpen(true);
        }}
      />
    </div>
  );
}