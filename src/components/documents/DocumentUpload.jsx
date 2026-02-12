import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentUpload({ open, onOpenChange, transaction, currentUser, userRole }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    document_type: '',
    category: 'other',
    stage: transaction.current_stage,
    notes: '',
    tags: '',
    access_control: {
      visible_to_agent: true,
      visible_to_buyer: true,
      visible_to_lender: false,
      visible_to_builder: true
    }
  });

  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onOpenChange(false);
      resetForm();
      toast.success('Document uploaded successfully!');
    }
  });

  const resetForm = () => {
    setFile(null);
    setFormData({
      document_type: '',
      category: 'other',
      stage: transaction.current_stage,
      notes: '',
      tags: '',
      access_control: {
        visible_to_agent: true,
        visible_to_buyer: true,
        visible_to_lender: false,
        visible_to_builder: true
      }
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.document_type) {
        setFormData({ ...formData, document_type: selectedFile.name });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!formData.document_type) {
      toast.error('Please enter a document name');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create document record
      const documentData = {
        transaction_id: transaction.id,
        document_type: formData.document_type,
        category: formData.category,
        stage: formData.stage,
        file_url,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: currentUser.email,
        upload_date: new Date().toISOString(),
        status: 'pending_review',
        version: 1,
        notes: formData.notes,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        access_control: formData.access_control
      };

      uploadMutation.mutate(documentData);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label>Select File</Label>
            <Input
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file && (
              <div className="text-sm text-slate-600 mt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Document Name */}
          <div>
            <Label>Document Name</Label>
            <Input
              placeholder="e.g., Purchase Agreement, Inspection Report"
              value={formData.document_type}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="disclosure">Disclosure</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="appraisal">Appraisal</SelectItem>
                <SelectItem value="loan">Loan Documents</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="closing">Closing Documents</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stage */}
          <div>
            <Label>Transaction Stage</Label>
            <Select
              value={formData.stage}
              onValueChange={(value) => setFormData({ ...formData, stage: value })}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_qual">Pre-Qualification</SelectItem>
                <SelectItem value="showing">Showing</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="under_contract">Under Contract</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              placeholder="urgent, signed, final"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              disabled={uploading}
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes about this document..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              disabled={uploading}
            />
          </div>

          {/* Access Controls */}
          {(userRole === 'agent' || userRole === 'admin') && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <Label>Document Visibility</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="visible_to_buyer"
                    checked={formData.access_control.visible_to_buyer}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        access_control: { ...formData.access_control, visible_to_buyer: checked }
                      })
                    }
                    disabled={uploading}
                  />
                  <Label htmlFor="visible_to_buyer" className="cursor-pointer">
                    Visible to Buyer
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="visible_to_lender"
                    checked={formData.access_control.visible_to_lender}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        access_control: { ...formData.access_control, visible_to_lender: checked }
                      })
                    }
                    disabled={uploading}
                  />
                  <Label htmlFor="visible_to_lender" className="cursor-pointer">
                    Visible to Lender
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="visible_to_builder"
                    checked={formData.access_control.visible_to_builder}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        access_control: { ...formData.access_control, visible_to_builder: checked }
                      })
                    }
                    disabled={uploading}
                  />
                  <Label htmlFor="visible_to_builder" className="cursor-pointer">
                    Visible to Builder/Admin
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}