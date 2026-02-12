import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Download, Trash2, CheckCircle, XCircle, History } from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentCard({ document, userRole, onPreview, onApprove, onReject, onDelete }) {
  const statusColors = {
    pending_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-slate-100 text-slate-800'
  };

  const categoryLabels = {
    contract: 'Contract',
    disclosure: 'Disclosure',
    inspection: 'Inspection',
    appraisal: 'Appraisal',
    loan: 'Loan',
    insurance: 'Insurance',
    closing: 'Closing',
    other: 'Other'
  };

  const stageLabels = {
    pre_qual: 'Pre-Qualification',
    showing: 'Showing',
    offer: 'Offer',
    under_contract: 'Under Contract',
    closing: 'Closing'
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = () => {
    if (document.file_type?.includes('pdf')) return '📄';
    if (document.file_type?.includes('image')) return '🖼️';
    if (document.file_type?.includes('word') || document.file_type?.includes('document')) return '📝';
    if (document.file_type?.includes('spreadsheet') || document.file_type?.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3 flex-1">
            <div className="text-3xl">{getFileIcon()}</div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-slate-900">{document.file_name || document.document_type}</h4>
                {document.version > 1 && (
                  <Badge variant="outline" className="text-xs">
                    <History className="w-3 h-3 mr-1" />
                    v{document.version}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className={statusColors[document.status]}>
                  {document.status.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline">
                  {categoryLabels[document.category] || document.category}
                </Badge>
                {document.stage && (
                  <Badge variant="outline">
                    {stageLabels[document.stage]}
                  </Badge>
                )}
              </div>

              <div className="text-sm text-slate-600 space-y-1">
                <div>Uploaded by {document.uploaded_by} • {format(new Date(document.upload_date), 'MMM d, yyyy')}</div>
                {document.file_size && <div>Size: {formatFileSize(document.file_size)}</div>}
                {document.notes && <div className="text-slate-500 italic">{document.notes}</div>}
              </div>

              {document.tags?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {document.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {document.version_history?.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  {document.version_history.length} previous version(s)
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onPreview}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(document.file_url, '_blank')}
            >
              <Download className="w-4 h-4" />
            </Button>
            {(userRole === 'agent' || userRole === 'admin') && document.status === 'pending_review' && (
              <>
                <Button size="sm" variant="outline" onClick={onApprove}>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </Button>
                <Button size="sm" variant="outline" onClick={onReject}>
                  <XCircle className="w-4 h-4 text-red-600" />
                </Button>
              </>
            )}
            {(userRole === 'agent' || userRole === 'admin') && (
              <Button size="sm" variant="outline" onClick={onDelete}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}