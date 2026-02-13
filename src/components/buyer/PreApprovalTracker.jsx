import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, XCircle, AlertCircle, Download } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function PreApprovalTracker({ buyerEmail }) {
  const { data: preApprovals = [] } = useQuery({
    queryKey: ['preapprovals', buyerEmail],
    queryFn: () => base44.entities.PreApproval.filter({ buyer_email: buyerEmail }, '-created_date'),
    enabled: !!buyerEmail
  });

  const activePreApproval = preApprovals.find(p => p.status === 'approved');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-slate-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (preApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-600 text-center font-semibold">No Pre-Approval Yet</p>
          <p className="text-sm text-slate-500 text-center mt-2 max-w-md">
            Get pre-approved to strengthen your offers and understand your budget
          </p>
          <Button className="mt-4">Apply for Pre-Approval</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activePreApproval && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Active Pre-Approval
              </CardTitle>
              <Badge className={getStatusColor('approved')}>Approved</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-600">Approved Amount</div>
                <div className="text-2xl font-bold text-green-600">
                  ${activePreApproval.approved_amount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Interest Rate</div>
                <div className="text-2xl font-bold text-slate-900">
                  {activePreApproval.interest_rate}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <div className="text-sm text-slate-600">Lender</div>
                <div className="font-semibold">{activePreApproval.lender_name}</div>
              </div>
              {activePreApproval.expiration_date && (
                <div className="text-right">
                  <div className="text-sm text-slate-600">Expires</div>
                  <div className="font-semibold">
                    {format(new Date(activePreApproval.expiration_date), 'MMM dd, yyyy')}
                    <span className="text-xs text-slate-500 ml-2">
                      ({differenceInDays(new Date(activePreApproval.expiration_date), new Date())} days)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {activePreApproval.conditions?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="font-semibold text-sm mb-2">Conditions:</div>
                <ul className="text-sm text-slate-700 space-y-1">
                  {activePreApproval.conditions.map((condition, idx) => (
                    <li key={idx}>• {condition}</li>
                  ))}
                </ul>
              </div>
            )}

            {activePreApproval.letter_url && (
              <Button className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Pre-Approval Letter
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {preApprovals.filter(p => p.id !== activePreApproval?.id).map(preApproval => (
        <Card key={preApproval.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {getStatusIcon(preApproval.status)}
                {preApproval.lender_name}
              </CardTitle>
              <Badge className={getStatusColor(preApproval.status)}>
                {preApproval.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-slate-600">Amount</div>
                <div className="text-lg font-semibold">
                  ${preApproval.approved_amount.toLocaleString()}
                </div>
              </div>
              {preApproval.approval_date && (
                <div className="text-right">
                  <div className="text-sm text-slate-600">Date</div>
                  <div className="text-sm font-semibold">
                    {format(new Date(preApproval.approval_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}