import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Clock, Search, Zap, History, Tag, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DOCUMENT_CATEGORIES = [
  { value: 'identification', label: 'Identification' },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'property_appraisal', label: 'Property Appraisal' },
  { value: 'title_report', label: 'Title Report' },
  { value: 'contract', label: 'Contract' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' }
];

export default function LenderDocumentManager({ transaction, documents = [], lenderEmail, allTransactions = [], borrowerData = {} }) {
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBorrower, setFilterBorrower] = useState('all');
  const [filterTransactionId, setFilterTransactionId] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [versionDialogDoc, setVersionDialogDoc] = useState(null);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false);
  const fileInputRef = useRef(null);
  const versionUploadRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch all documents if viewing across transactions
  const { data: allDocs = [] } = useQuery({
    queryKey: ['all-lender-documents'],
    queryFn: async () => {
      if (!allTransactions.length) return documents;
      const txnIds = allTransactions.map(t => t.id);
      const allDocuments = [];
      for (const txnId of txnIds) {
        const docs = await base44.entities.Document.filter({ transaction_id: txnId });
        const enrichedDocs = await Promise.all((docs || []).map(async d => {
          const txn = allTransactions.find(t => t.id === d.transaction_id);
          return { ...d, borrower_name: txn?.buyer_name || 'Unknown', transaction_id: txn?.id };
        }));
        allDocuments.push(...enrichedDocs);
      }
      return allDocuments;
    },
    enabled: allTransactions.length > 0
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.Document.create({
        transaction_id: transaction.id,
        document_type: 'loan_document',
        category: 'loan',
        stage: transaction.current_stage,
        file_url,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: lenderEmail,
        status: 'pending_review'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lender-documents'] });
      toast.success('Document uploaded');
      setUploading(false);
      fileInputRef.current.value = '';
    },
    onError: (err) => {
      toast.error('Failed to upload document');
      setUploading(false);
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    uploadDocMutation.mutate(file);
  };

  const verifyDocsMutation = useMutation({
    mutationFn: async ({ docIds, newStatus }) => {
      const updates = docIds.map(id => 
        base44.entities.Document.update(id, { 
          status: newStatus,
          verification_status: newStatus === 'approved' ? 'verified' : 'rejected'
        })
      );
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-lender-documents'] });
      queryClient.invalidateQueries({ queryKey: ['lender-documents'] });
      setSelectedDocs(new Set());
      toast.success('Documents updated successfully');
    },
    onError: () => {
      toast.error('Failed to update documents');
    }
  });

  const aiVerifyMutation = useMutation({
    mutationFn: async (docId) => {
      const doc = (allTransactions.length > 0 ? allDocs : documents).find(d => d.id === docId);
      if (!doc) throw new Error('Document not found');
      
      const { data } = await base44.functions.invoke('verifyDocumentAI', {
        documentId: docId,
        fileUrl: doc.file_url,
        documentType: doc.category || 'other',
        category: doc.category
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-lender-documents'] });
      queryClient.invalidateQueries({ queryKey: ['lender-documents'] });
      toast.success(data.auto_verified ? 'Document auto-verified!' : 'Document analysis complete - manual review needed');
    },
    onError: (err) => {
      toast.error('AI verification failed: ' + err.message);
    }
  });

  // Auto-categorize document
  const categorizeMutation = useMutation({
    mutationFn: async (docId) => {
      const doc = (allTransactions.length > 0 ? allDocs : documents).find(d => d.id === docId);
      if (!doc) throw new Error('Document not found');
      
      const { data } = await base44.functions.invoke('categorizeDocument', {
        documentId: docId,
        fileUrl: doc.file_url,
        fileName: doc.file_name
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-lender-documents'] });
      queryClient.invalidateQueries({ queryKey: ['lender-documents'] });
      toast.success(`Categorized as: ${data.category} (${data.confidence}% confidence)`);
    },
    onError: (err) => {
      toast.error('Auto-categorization failed: ' + err.message);
    }
  });

  // Upload new version
  const uploadVersionMutation = useMutation({
    mutationFn: async ({ parentDoc, file, notes }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Archive old version
      const versionHistory = parentDoc.version_history || [];
      versionHistory.push({
        version: parentDoc.version,
        file_url: parentDoc.file_url,
        file_name: parentDoc.file_name,
        uploaded_by: parentDoc.uploaded_by,
        upload_date: parentDoc.uploaded_at || parentDoc.created_date,
        notes: parentDoc.notes,
        status: parentDoc.status
      });

      // Update parent document with new version
      return base44.entities.Document.update(parentDoc.id, {
        file_url,
        file_name: file.name,
        file_size: file.size,
        version: parentDoc.version + 1,
        version_history: versionHistory,
        uploaded_by: lenderEmail,
        uploaded_at: new Date().toISOString(),
        status: 'pending_review',
        notes: notes || `Version ${parentDoc.version + 1} uploaded`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-lender-documents'] });
      queryClient.invalidateQueries({ queryKey: ['lender-documents'] });
      setVersionDialogDoc(null);
      toast.success('New version uploaded successfully');
    },
    onError: (err) => {
      toast.error('Failed to upload version: ' + err.message);
    }
  });

  // Revert to previous version
  const revertVersionMutation = useMutation({
    mutationFn: async ({ doc, versionIndex }) => {
      const targetVersion = doc.version_history[versionIndex];
      if (!targetVersion) throw new Error('Version not found');

      // Archive current version
      const versionHistory = [...doc.version_history];
      versionHistory.push({
        version: doc.version,
        file_url: doc.file_url,
        file_name: doc.file_name,
        uploaded_by: doc.uploaded_by,
        upload_date: doc.uploaded_at || doc.created_date,
        notes: doc.notes,
        status: doc.status
      });

      // Remove the target version from history
      versionHistory.splice(versionIndex, 1);

      return base44.entities.Document.update(doc.id, {
        file_url: targetVersion.file_url,
        file_name: targetVersion.file_name,
        version: doc.version + 1,
        version_history: versionHistory,
        uploaded_by: lenderEmail,
        uploaded_at: new Date().toISOString(),
        status: 'pending_review',
        notes: `Reverted to version ${targetVersion.version}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-lender-documents'] });
      queryClient.invalidateQueries({ queryKey: ['lender-documents'] });
      setVersionDialogDoc(null);
      toast.success('Reverted to previous version');
    },
    onError: (err) => {
      toast.error('Failed to revert: ' + err.message);
    }
  });

  // Bulk tagging
  const bulkTagMutation = useMutation({
    mutationFn: async ({ docIds, tags }) => {
      const updates = docIds.map(id => {
        const doc = (allTransactions.length > 0 ? allDocs : documents).find(d => d.id === id);
        const existingTags = doc?.tags || [];
        const newTags = [...new Set([...existingTags, ...tags])];
        return base44.entities.Document.update(id, { tags: newTags });
      });
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-lender-documents'] });
      queryClient.invalidateQueries({ queryKey: ['lender-documents'] });
      setSelectedDocs(new Set());
      setShowBulkTagDialog(false);
      setBulkTagInput('');
      toast.success('Tags added successfully');
    },
    onError: () => {
      toast.error('Failed to add tags');
    }
  });

  // Bulk download
  const handleBulkDownload = async () => {
    const docs = (allTransactions.length > 0 ? allDocs : documents).filter(d => selectedDocs.has(d.id));
    for (const doc of docs) {
      window.open(doc.file_url, '_blank');
      await new Promise(resolve => setTimeout(resolve, 500)); // Stagger downloads
    }
    toast.success(`Opening ${docs.length} documents...`);
  };

  // Use all docs or filtered docs based on context
  const displayDocs = allTransactions.length > 0 ? allDocs : documents;
  const loanDocs = displayDocs.filter(d => d.category === 'loan' || d.document_type === 'loan_document');
  
  // Get unique borrowers and transactions for filter dropdowns
  const uniqueBorrowers = [...new Set(loanDocs.map(d => d.borrower_name || 'Unknown'))].sort();
  const uniqueTransactions = [...new Set(loanDocs.map(d => d.transaction_id))].sort();
  
  // Filter by search, status, category, borrower, transaction, and date range
  const filteredDocs = loanDocs.filter(doc => {
    const docDate = new Date(doc.upload_date || doc.created_date);
    const fromDate = filterDateFrom ? new Date(filterDateFrom) : null;
    const toDate = filterDateTo ? new Date(filterDateTo) : null;
    
    const matchesSearch = !searchTerm || 
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.borrower_name && doc.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesBorrower = filterBorrower === 'all' || doc.borrower_name === filterBorrower;
    const matchesTransaction = filterTransactionId === 'all' || doc.transaction_id === filterTransactionId;
    const matchesDate = (!fromDate || docDate >= fromDate) && (!toDate || docDate <= toDate);
    
    return matchesSearch && matchesStatus && matchesCategory && matchesBorrower && matchesTransaction && matchesDate;
  });

  const handleSelectDoc = (docId) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocs.size === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-4">
       {/* Upload Section */}
       <Card>
         <CardHeader>
           <CardTitle className="text-base">Upload Loan Documents</CardTitle>
         </CardHeader>
         <CardContent>
           <input
             ref={fileInputRef}
             type="file"
             onChange={handleFileSelect}
             disabled={uploading}
             className="hidden"
             accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
           />
           <Button
             onClick={() => fileInputRef.current?.click()}
             disabled={uploading}
             className="w-full"
           >
             <Upload className="w-4 h-4 mr-2" />
             {uploading ? 'Uploading...' : 'Upload Document'}
           </Button>
           <p className="text-xs text-slate-500 mt-2">
             Appraisals, loan approvals, conditions, disclosures
           </p>
         </CardContent>
       </Card>

       {/* Search and Filter Section */}
       {loanDocs.length > 0 && (
         <Card>
           <CardContent className="p-4 space-y-3">
             <div className="flex gap-2 flex-wrap">
               <div className="flex-1 min-w-48 relative">
                 <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                 <Input
                   placeholder="Search documents or borrower..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-8"
                 />
               </div>
               <select
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
                 className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
               >
                 <option value="all">All Status</option>
                 <option value="pending_review">Pending</option>
                 <option value="approved">Approved</option>
                 <option value="rejected">Rejected</option>
               </select>
               <select
                 value={filterCategory}
                 onChange={(e) => setFilterCategory(e.target.value)}
                 className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
               >
                 <option value="all">All Categories</option>
                 {DOCUMENT_CATEGORIES.map(cat => (
                   <option key={cat.value} value={cat.value}>{cat.label}</option>
                 ))}
               </select>
             </div>

             <div className="flex gap-2 flex-wrap">
               {uniqueBorrowers.length > 1 && (
                 <select
                   value={filterBorrower}
                   onChange={(e) => setFilterBorrower(e.target.value)}
                   className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-40"
                 >
                   <option value="all">All Borrowers</option>
                   {uniqueBorrowers.map(name => (
                     <option key={name} value={name}>{name}</option>
                   ))}
                 </select>
               )}
               
               {uniqueTransactions.length > 1 && (
                 <select
                   value={filterTransactionId}
                   onChange={(e) => setFilterTransactionId(e.target.value)}
                   className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-40"
                 >
                   <option value="all">All Transactions</option>
                   {uniqueTransactions.map(txnId => (
                     <option key={txnId} value={txnId}>{txnId.slice(0, 8)}...</option>
                   ))}
                 </select>
               )}

               <Input
                 type="date"
                 value={filterDateFrom}
                 onChange={(e) => setFilterDateFrom(e.target.value)}
                 className="px-3 py-2 text-sm w-40"
                 placeholder="From date"
               />
               <Input
                 type="date"
                 value={filterDateTo}
                 onChange={(e) => setFilterDateTo(e.target.value)}
                 className="px-3 py-2 text-sm w-40"
                 placeholder="To date"
               />
             </div>

             {/* Bulk Actions */}
             {filteredDocs.length > 0 && (
               <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <Checkbox
                     checked={selectedDocs.size === filteredDocs.length && filteredDocs.length > 0}
                     onCheckedChange={handleSelectAll}
                   />
                   <span className="text-sm text-slate-600">
                     {selectedDocs.size === 0 ? 'Select All' : `${selectedDocs.size} selected`}
                   </span>
                 </label>

                 {selectedDocs.size > 0 && (
                   <div className="flex gap-2 flex-wrap">
                     <Button
                       size="sm"
                       className="bg-green-600 hover:bg-green-700"
                       onClick={() => verifyDocsMutation.mutate({ 
                         docIds: Array.from(selectedDocs), 
                         newStatus: 'approved' 
                       })}
                       disabled={verifyDocsMutation.isPending}
                     >
                       <CheckCircle2 className="w-3 h-3 mr-1" />
                       Approve
                     </Button>
                     <Button
                       size="sm"
                       variant="destructive"
                       onClick={() => verifyDocsMutation.mutate({ 
                         docIds: Array.from(selectedDocs), 
                         newStatus: 'rejected' 
                       })}
                       disabled={verifyDocsMutation.isPending}
                     >
                       <AlertCircle className="w-3 h-3 mr-1" />
                       Reject
                     </Button>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={handleBulkDownload}
                     >
                       <Download className="w-3 h-3 mr-1" />
                       Download
                     </Button>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => setShowBulkTagDialog(true)}
                     >
                       <Tag className="w-3 h-3 mr-1" />
                       Tag
                     </Button>
                   </div>
                 )}
               </div>
             )}
           </CardContent>
         </Card>
       )}

       {/* Documents List */}
       {filteredDocs.length === 0 ? (
         <Card>
           <CardContent className="py-8 text-center text-slate-500">
             <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
             <p>{loanDocs.length === 0 ? 'No loan documents uploaded yet' : 'No documents match your search'}</p>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-2">
           {filteredDocs.map(doc => (
             <Card key={doc.id}>
               <CardContent className="p-4">
                 <div className="flex items-center justify-between gap-4">
                   <div className="flex items-center gap-3 flex-1 min-w-0">
                     <Checkbox
                       checked={selectedDocs.has(doc.id)}
                       onCheckedChange={() => handleSelectDoc(doc.id)}
                     />
                     <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                     <div className="min-w-0 flex-1">
                       <p className="font-medium text-slate-900 truncate">{doc.file_name}</p>
                       <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                         <span>{doc.document_type.replace(/_/g, ' ')}</span>
                         <span>•</span>
                         <span>{doc.stage?.replace(/_/g, ' ')}</span>
                       </div>
                     </div>
                   </div>

                   <div className="flex items-center gap-2 flex-wrap">
                     <Badge className={getStatusColor(doc.status)}>
                       {getStatusIcon(doc.status)}
                       <span className="ml-1 text-xs">{doc.status.replace(/_/g, ' ')}</span>
                     </Badge>
                     {doc.version > 1 && (
                       <Badge variant="outline" className="text-xs">
                         v{doc.version}
                       </Badge>
                     )}
                     {doc.auto_categorized && (
                       <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                         <Zap className="w-3 h-3 mr-1" />
                         Auto
                       </Badge>
                     )}
                     {doc.status === 'pending_review' && ['identification', 'income_proof', 'property_appraisal'].includes(doc.category) && (
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => aiVerifyMutation.mutate(doc.id)}
                         disabled={aiVerifyMutation.isPending}
                         title="AI-powered verification"
                       >
                         <Zap className="w-3 h-3" />
                       </Button>
                     )}
                     {!doc.auto_categorized && (
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => categorizeMutation.mutate(doc.id)}
                         disabled={categorizeMutation.isPending}
                         title="Auto-categorize with AI"
                       >
                         <Tag className="w-3 h-3" />
                       </Button>
                     )}
                     <Dialog>
                       <DialogTrigger asChild>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => setVersionDialogDoc(doc)}
                           title="Version history"
                         >
                           <History className="w-3 h-3" />
                         </Button>
                       </DialogTrigger>
                       <DialogContent className="max-w-2xl">
                         <DialogHeader>
                           <DialogTitle>Version History - {doc.file_name}</DialogTitle>
                         </DialogHeader>
                         <div className="space-y-3 max-h-96 overflow-y-auto">
                           {/* Current Version */}
                           <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                             <div className="flex items-center justify-between mb-2">
                               <Badge className="bg-blue-600 text-white">Current - v{doc.version}</Badge>
                               <span className="text-xs text-slate-600">
                                 {format(new Date(doc.uploaded_at || doc.created_date), 'MMM d, yyyy HH:mm')}
                               </span>
                             </div>
                             <p className="text-sm text-slate-700 mb-2">{doc.file_name}</p>
                             <p className="text-xs text-slate-600">Uploaded by: {doc.uploaded_by}</p>
                             {doc.notes && <p className="text-xs text-slate-600 mt-1">Notes: {doc.notes}</p>}
                           </div>

                           {/* Previous Versions */}
                           {doc.version_history?.map((version, idx) => (
                             <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                               <div className="flex items-center justify-between mb-2">
                                 <Badge variant="outline">v{version.version}</Badge>
                                 <span className="text-xs text-slate-600">
                                   {format(new Date(version.upload_date), 'MMM d, yyyy HH:mm')}
                                 </span>
                               </div>
                               <p className="text-sm text-slate-700 mb-2">{version.file_name}</p>
                               <p className="text-xs text-slate-600">Uploaded by: {version.uploaded_by}</p>
                               {version.notes && <p className="text-xs text-slate-600 mt-1">Notes: {version.notes}</p>}
                               <div className="flex gap-2 mt-3">
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => window.open(version.file_url, '_blank')}
                                 >
                                   <Download className="w-3 h-3 mr-1" />
                                   Download
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => revertVersionMutation.mutate({ doc, versionIndex: idx })}
                                   disabled={revertVersionMutation.isPending}
                                 >
                                   <RotateCcw className="w-3 h-3 mr-1" />
                                   Revert to This
                                 </Button>
                               </div>
                             </div>
                           ))}

                           {(!doc.version_history || doc.version_history.length === 0) && doc.version === 1 && (
                             <p className="text-sm text-slate-500 text-center py-4">No previous versions</p>
                           )}

                           {/* Upload New Version */}
                           <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
                             <p className="text-sm font-medium text-slate-900 mb-3">Upload New Version</p>
                             <input
                               ref={versionUploadRef}
                               type="file"
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                   uploadVersionMutation.mutate({ parentDoc: doc, file });
                                 }
                               }}
                               className="hidden"
                             />
                             <Button
                               size="sm"
                               onClick={() => versionUploadRef.current?.click()}
                               disabled={uploadVersionMutation.isPending}
                               className="w-full"
                             >
                               <Upload className="w-3 h-3 mr-1" />
                               {uploadVersionMutation.isPending ? 'Uploading...' : 'Upload New Version'}
                             </Button>
                           </div>
                         </div>
                       </DialogContent>
                     </Dialog>
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={() => window.open(doc.file_url, '_blank')}
                     >
                       <Download className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>
               </CardContent>
             </Card>
           ))}
           </div>
           )}

           {/* Bulk Tag Dialog */}
           <Dialog open={showBulkTagDialog} onOpenChange={setShowBulkTagDialog}>
           <DialogContent>
           <DialogHeader>
             <DialogTitle>Add Tags to {selectedDocs.size} Documents</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <Input
               placeholder="Enter tags separated by commas (e.g., urgent, reviewed, q1-2024)"
               value={bulkTagInput}
               onChange={(e) => setBulkTagInput(e.target.value)}
             />
             <div className="flex gap-2 justify-end">
               <Button variant="outline" onClick={() => setShowBulkTagDialog(false)}>
                 Cancel
               </Button>
               <Button
                 onClick={() => {
                   const tags = bulkTagInput.split(',').map(t => t.trim()).filter(t => t);
                   if (tags.length > 0) {
                     bulkTagMutation.mutate({ docIds: Array.from(selectedDocs), tags });
                   }
                 }}
                 disabled={!bulkTagInput.trim() || bulkTagMutation.isPending}
               >
                 <Tag className="w-4 h-4 mr-2" />
                 Add Tags
               </Button>
             </div>
           </div>
           </DialogContent>
           </Dialog>
           </div>
           );
           }