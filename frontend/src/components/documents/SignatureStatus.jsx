import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function SignatureStatus({ document }) {
  const queryClient = useQueryClient();

  const checkStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('docusignCheckStatus', {
        document_id: document.id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error('Failed to check status');
    }
  });

  if (!document.signature_request) return null;

  const { signers, requested_date, completion_date } = document.signature_request;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'delivered':
      case 'sent':
        return <Eye className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'delivered':
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Signature Status</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => checkStatusMutation.mutate()}
          disabled={checkStatusMutation.isPending}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${checkStatusMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="text-xs text-slate-600">
        Sent: {format(new Date(requested_date), 'PPpp')}
      </div>

      {completion_date && (
        <div className="text-xs text-green-600 font-medium">
          ✓ Completed: {format(new Date(completion_date), 'PPpp')}
        </div>
      )}

      <div className="space-y-2">
        {signers.map((signer, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(signer.status)}
              <div>
                <div className="text-sm font-medium">{signer.name}</div>
                <div className="text-xs text-slate-600">{signer.email}</div>
                {signer.role && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {signer.role}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge className={getStatusColor(signer.status)}>
                {signer.status}
              </Badge>
              {signer.signed_date && (
                <div className="text-xs text-slate-600 mt-1">
                  {format(new Date(signer.signed_date), 'MMM d, h:mm a')}
                </div>
              )}
              {signer.declined_reason && (
                <div className="text-xs text-red-600 mt-1">
                  {signer.declined_reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}