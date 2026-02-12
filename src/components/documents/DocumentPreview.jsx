import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, History, Upload } from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentPreview({ document, open, onOpenChange, onNewVersion }) {
  if (!document) return null;

  const isPreviewable = document.file_type?.includes('pdf') || document.file_type?.includes('image');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{document.file_name || document.document_type}</span>
            <div className="flex gap-2">
              {document.version > 1 && (
                <Badge variant="outline">
                  <History className="w-3 h-3 mr-1" />
                  Version {document.version}
                </Badge>
              )}
              <Badge>{document.status.replace(/_/g, ' ')}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Document Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg text-sm">
          <div>
            <span className="text-slate-600">Category:</span>
            <span className="ml-2 font-medium">{document.category}</span>
          </div>
          <div>
            <span className="text-slate-600">Stage:</span>
            <span className="ml-2 font-medium">{document.stage?.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-slate-600">Uploaded by:</span>
            <span className="ml-2 font-medium">{document.uploaded_by}</span>
          </div>
          <div>
            <span className="text-slate-600">Upload date:</span>
            <span className="ml-2 font-medium">
              {format(new Date(document.upload_date), 'PPpp')}
            </span>
          </div>
          {document.file_size && (
            <div>
              <span className="text-slate-600">File size:</span>
              <span className="ml-2 font-medium">
                {(document.file_size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}
          {document.file_type && (
            <div>
              <span className="text-slate-600">File type:</span>
              <span className="ml-2 font-medium">{document.file_type}</span>
            </div>
          )}
        </div>

        {document.notes && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-slate-700 mb-1">Notes:</div>
            <div className="text-sm text-slate-600">{document.notes}</div>
          </div>
        )}

        {document.tags?.length > 0 && (
          <div className="flex gap-2">
            {document.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className="border rounded-lg overflow-hidden bg-slate-50" style={{ minHeight: '400px' }}>
          {isPreviewable ? (
            document.file_type?.includes('pdf') ? (
              <iframe
                src={document.file_url}
                className="w-full h-[500px]"
                title="Document preview"
              />
            ) : (
              <img
                src={document.file_url}
                alt={document.file_name}
                className="w-full h-auto"
              />
            )
          ) : (
            <div className="flex items-center justify-center h-[400px] text-slate-500">
              Preview not available for this file type
            </div>
          )}
        </div>

        {/* Version History */}
        {document.version_history?.length > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-sm">Version History:</div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {document.version_history.map((version, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <div>
                    <span className="font-medium">Version {version.version}</span>
                    <span className="text-slate-600 ml-2">
                      by {version.uploaded_by}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    {format(new Date(version.upload_date), 'MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => window.open(document.file_url, '_blank')}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button onClick={onNewVersion}>
            <Upload className="w-4 h-4 mr-2" />
            Upload New Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}