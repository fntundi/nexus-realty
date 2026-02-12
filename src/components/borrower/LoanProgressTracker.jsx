import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function LoanProgressTracker({ transaction, documents }) {
  const stages = [
    { id: 'application', label: 'Application Submitted', status: 'completed' },
    { id: 'review', label: 'Under Review', status: transaction.status === 'under_review' ? 'active' : transaction.status === 'approved' ? 'completed' : 'pending' },
    { id: 'documents', label: 'Document Verification', status: documents.every(d => d.status === 'received') ? 'completed' : 'active' },
    { id: 'approval', label: 'Approval & Closing', status: transaction.status === 'approved' ? 'completed' : 'pending' }
  ];

  const pendingDocs = documents.filter(d => d.status === 'pending');
  const receivedDocs = documents.filter(d => d.status === 'received');

  const getStageIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-6 h-6 text-green-600" />;
    if (status === 'active') return <Clock className="w-6 h-6 text-blue-600" />;
    return <Clock className="w-6 h-6 text-slate-300" />;
  };

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Application Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  {getStageIcon(stage.status)}
                  {idx < stages.length - 1 && (
                    <div className={`w-1 h-12 my-2 ${
                      stage.status === 'completed' ? 'bg-green-600' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className={`font-semibold ${
                    stage.status === 'completed' ? 'text-green-600' :
                    stage.status === 'active' ? 'text-blue-600' :
                    'text-slate-400'
                  }`}>
                    {stage.label}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {stage.status === 'completed' && 'Completed'}
                    {stage.status === 'active' && 'In progress'}
                    {stage.status === 'pending' && 'Waiting for previous stages'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Document Status
            {pendingDocs.length > 0 && <AlertCircle className="w-4 h-4 text-amber-600" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-semibold text-slate-900">Received Documents</p>
                <p className="text-sm text-slate-600">{receivedDocs.length} documents uploaded and verified</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>

            {pendingDocs.length > 0 && (
              <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <p className="font-semibold text-slate-900">Pending Documents</p>
                  <p className="text-sm text-slate-600">{pendingDocs.length} documents still needed</p>
                  <ul className="text-sm text-slate-600 mt-2 space-y-1">
                    {pendingDocs.slice(0, 3).map(doc => (
                      <li key={doc.id}>• {doc.document_type}</li>
                    ))}
                  </ul>
                </div>
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Information */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Loan Amount</p>
              <p className="text-xl font-bold text-slate-900">${(transaction.loan_amount / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Property Price</p>
              <p className="text-xl font-bold text-slate-900">${(transaction.property_price / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Loan Type</p>
              <p className="text-xl font-bold text-slate-900">{transaction.loan_type || 'Conventional'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Expected Closing</p>
              <p className="text-xl font-bold text-slate-900">
                {transaction.closing_date ? new Date(transaction.closing_date).toLocaleDateString() : 'TBD'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}