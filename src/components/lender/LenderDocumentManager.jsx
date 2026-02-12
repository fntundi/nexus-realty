import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function LenderDocumentManager({ transaction, documents = [], lenderEmail, allTransactions = [] }) {
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const fileInputRef = useRef(null);
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
        allDocuments.push(...(docs || []));
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

  // Use all docs or filtered docs based on context
  const displayDocs = allTransactions.length > 0 ? allDocs : documents;
  const loanDocs = displayDocs.filter(d => d.category === 'loan' || d.document_type === 'loan_document');
  
  // Filter by search and status
  const filteredDocs = loanDocs.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
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
             <div className="flex gap-2">
               <div className="flex-1 relative">
                 <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                 <Input
                   placeholder="Search documents..."
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
                   <div className="flex gap-2">
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
                       Approve Selected
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
                       Reject Selected
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

                   <div className="flex items-center gap-3">
                     <Badge className={getStatusColor(doc.status)}>
                       {getStatusIcon(doc.status)}
                       <span className="ml-1 text-xs">{doc.status.replace(/_/g, ' ')}</span>
                     </Badge>
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
    </div>
  );
  }