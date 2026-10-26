import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

const STATUS_STYLES = {
  verified: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  warn: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function DealDocuments({ transactionId, role }) {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['deal-docs', transactionId],
    queryFn: () => base44.entities.Document.filter({ transaction_id: transactionId }, '-created_date'),
  });

  const visibleKey = `visible_to_${role}`;
  const visible = documents.filter(
    (d) => role === 'admin' || d.access_control?.[visibleKey] !== false
  );

  if (isLoading) return <p className="text-sm text-slate-500">Loading documents...</p>;
  if (visible.length === 0) return <p className="text-sm text-slate-500">No documents shared on this deal yet.</p>;

  return (
    <ul className="divide-y">
      {visible.map((d) => (
        <li key={d.id} className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{d.file_name || d.document_type}</p>
              <p className="text-xs text-slate-500">{d.document_type?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <Badge className={STATUS_STYLES[d.verification_status || 'pending']}>
            {d.verification_status || 'pending'}
          </Badge>
        </li>
      ))}
    </ul>
  );
}