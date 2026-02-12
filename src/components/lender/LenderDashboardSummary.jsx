import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle, CheckCircle2, Clock, TrendingUp, FileText,
  Flag, Calendar, BarChart3
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function LenderDashboardSummary({ 
  transactions = [], 
  documents = [], 
  onViewDocument,
  onViewFlagged 
}) {
  // Calculate metrics
  const pendingVerifications = documents.filter(d => d.status === 'pending_review').length;
  const approvedDocs = documents.filter(d => d.status === 'approved').length;
  const rejectedDocs = documents.filter(d => d.status === 'rejected').length;
  const flaggedDocs = documents.filter(d => d.ai_verification_result?.analysis?.verification_status === 'warn').length;

  // Calculate average processing time
  const closedTransactions = transactions.filter(t => t.status === 'closed' && t.closed_date);
  const avgProcessingTime = closedTransactions.length > 0
    ? Math.round(
        closedTransactions.reduce((sum, t) => {
          return sum + differenceInDays(new Date(t.closed_date), new Date(t.created_date));
        }, 0) / closedTransactions.length
      )
    : 0;

  // Calculate approval rate
  const totalCompletedTxns = closedTransactions.length + transactions.filter(t => t.status === 'rejected').length;
  const approvalRate = totalCompletedTxns > 0
    ? Math.round((closedTransactions.length / totalCompletedTxns) * 100)
    : 0;

  // Get recently reviewed documents (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyReviewed = documents
    .filter(d => d.status === 'approved' && d.updated_date && new Date(d.updated_date) > sevenDaysAgo)
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 5);

  // Get flagged/concerning documents
  const concerningDocs = documents
    .filter(d => 
      d.ai_verification_result?.analysis?.verification_status === 'warn' ||
      d.status === 'rejected' ||
      (d.ai_verification_result?.analysis?.is_expired)
    )
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{pendingVerifications}</div>
            <p className="text-xs text-slate-500 mt-1">documents awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{approvalRate}%</div>
            <p className="text-xs text-slate-500 mt-1">{closedTransactions.length} approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Processing Time</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{avgProcessingTime}</div>
            <p className="text-xs text-slate-500 mt-1">days to close</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Flagged Items</CardTitle>
            <Flag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{flaggedDocs}</div>
            <p className="text-xs text-slate-500 mt-1">need attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Verification Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Document Verification Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-900">Pending Review</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800">{pendingVerifications}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-slate-900">Approved</span>
              </div>
              <Badge className="bg-green-100 text-green-800">{approvedDocs}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-slate-900">Flagged for Review</span>
              </div>
              <Badge className="bg-orange-100 text-orange-800">{flaggedDocs}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-slate-900">Rejected</span>
              </div>
              <Badge className="bg-red-100 text-red-800">{rejectedDocs}</Badge>
            </div>

            {flaggedDocs > 0 && (
              <Button
                onClick={onViewFlagged}
                variant="outline"
                className="w-full mt-4 text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                View Flagged Items ({flaggedDocs})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recently Reviewed Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Recently Approved (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentlyReviewed.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No approved documents in the last 7 days</p>
            ) : (
              <div className="space-y-2">
                {recentlyReviewed.map(doc => (
                  <div
                    key={doc.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors"
                    onClick={() => onViewDocument?.(doc)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                            {doc.category || 'Document'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(doc.updated_date), 'MMM d')}
                          </span>
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Concerning Documents */}
      {concerningDocs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Items Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {concerningDocs.map(doc => (
                <div
                  key={doc.id}
                  className="p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 cursor-pointer transition-colors"
                  onClick={() => onViewDocument?.(doc)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                          {doc.status === 'rejected' ? 'Rejected' : 'Needs Review'}
                        </span>
                        {doc.ai_verification_result?.analysis?.issues && (
                          <span className="text-xs text-orange-700">
                            {doc.ai_verification_result.analysis.issues[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}