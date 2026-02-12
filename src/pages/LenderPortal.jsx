import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, FileText, MessageSquare, TrendingUp, 
  Clock, CheckCircle2, AlertCircle, Home, Zap, Loader
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LenderDocumentManager from '../components/lender/LenderDocumentManager';
import MessageThread from '../components/messaging/MessageThread';

export default function LenderPortal() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [eligibilityResults, setEligibilityResults] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Get transactions where this user is the lender
  const { data: transactions = [] } = useQuery({
    queryKey: ['lender-transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter(
      { lender_email: user?.email },
      '-updated_date'
    ),
    enabled: !!user?.email
  });

  // Get documents for these transactions
  const { data: documents = [] } = useQuery({
    queryKey: ['lender-documents', user?.email],
    queryFn: async () => {
      if (transactions.length === 0) return [];
      const txnIds = transactions.map(t => t.id);
      const allDocs = [];
      for (const txnId of txnIds) {
        const docs = await base44.entities.Document.filter({ transaction_id: txnId });
        allDocs.push(...(docs || []));
      }
      return allDocs;
    },
    enabled: !!transactions.length
  });

  // Get properties
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);
  const getTransactionDocuments = (txnId) => documents.filter(d => d.transaction_id === txnId);

  // Eligibility check mutation
  const eligibilityMutation = useMutation({
    mutationFn: async (transactionId) => {
      setCheckingEligibility(transactionId);
      const response = await base44.functions.invoke('checkLoanEligibility', { transactionId });
      return response.data;
    },
    onSuccess: (data) => {
      setEligibilityResults(data);
      setCheckingEligibility(null);
    },
    onError: (error) => {
      setEligibilityResults({ error: error.message });
      setCheckingEligibility(null);
    }
  });

  const handleCheckEligibility = (txnId) => {
    eligibilityMutation.mutate(txnId);
  };

  // Calculate metrics
  const activeLoans = transactions.filter(t => t.status === 'active');
  const closingLoans = transactions.filter(t => t.current_stage === 'closing');
  const totalValue = transactions.reduce((sum, t) => sum + (t.loan_amount || 0), 0);

  const loanStageColor = {
    pre_qual: 'bg-yellow-100 text-yellow-800',
    showing: 'bg-blue-100 text-blue-800',
    offer: 'bg-purple-100 text-purple-800',
    under_contract: 'bg-orange-100 text-orange-800',
    closing: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800'
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Loan Portfolio</h1>
          <p className="text-slate-600 mt-1">{user.full_name} • Track your active loans and loan documents</p>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Loans</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeLoans.length}</div>
              <p className="text-xs text-slate-500 mt-1">{closingLoans.length} in closing stage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${(totalValue / 1000000).toFixed(1)}M</div>
              <p className="text-xs text-slate-500 mt-1">across all transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Documents</CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{documents.length}</div>
              <p className="text-xs text-slate-500 mt-1">appraisals, approvals, conditions</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Loans</TabsTrigger>
            <TabsTrigger value="eligibility">Eligibility Check</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Active Loans Tab */}
          <TabsContent value="active" className="space-y-4 mt-6">
            {activeLoans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No active loans assigned to you</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeLoans.map(txn => {
                  const property = getProperty(txn.property_id);
                  const txnDocs = getTransactionDocuments(txn.id);

                  return (
                    <Card key={txn.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-slate-900">
                                {property?.address || 'Property TBD'}
                              </h3>
                              <Badge className={loanStageColor[txn.current_stage]}>
                                {txn.current_stage.replace(/_/g, ' ')}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 mb-3">
                              {txn.loan_amount && (
                                <div>
                                  <span className="text-xs text-slate-500">Loan Amount</span>
                                  <p className="font-medium text-slate-900">${txn.loan_amount.toLocaleString()}</p>
                                </div>
                              )}
                              {txn.buyer_name && (
                                <div>
                                  <span className="text-xs text-slate-500">Borrower</span>
                                  <p className="font-medium text-slate-900">{txn.buyer_name}</p>
                                </div>
                              )}
                              {txn.closing_date && (
                                <div>
                                  <span className="text-xs text-slate-500">Closing</span>
                                  <p className="font-medium text-slate-900">{format(new Date(txn.closing_date), 'MMM d, yyyy')}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-xs text-slate-500">Documents</span>
                                <p className="font-medium text-slate-900">{txnDocs.length} files</p>
                              </div>
                            </div>

                            {/* Loan Status Progress */}
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              {txn.current_stage === 'closing' && (
                                <>
                                  <AlertCircle className="w-4 h-4 text-orange-500" />
                                  <span>Final stage—complete loan conditions</span>
                                </>
                              )}
                              {txn.current_stage === 'under_contract' && (
                                <>
                                  <Clock className="w-4 h-4 text-blue-500" />
                                  <span>Appraisal and underwriting in progress</span>
                                </>
                              )}
                              {txn.current_stage === 'offer' && (
                                <>
                                  <Clock className="w-4 h-4 text-blue-500" />
                                  <span>Pre-qualification review</span>
                                </>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedTransaction(txn);
                              setDetailsOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            {transactions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No loans to manage documents for</p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue={transactions[0]?.id} className="w-full">
                <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0 mb-4">
                  {transactions.map(txn => (
                    <TabsTrigger
                      key={txn.id}
                      value={txn.id}
                      className="text-xs"
                    >
                      {getProperty(txn.property_id)?.address?.split(' ')[0] || 'Loan'} {txn.id.slice(0, 4)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {transactions.map(txn => (
                  <TabsContent key={txn.id} value={txn.id} className="space-y-4">
                    <LenderDocumentManager
                      transaction={txn}
                      documents={getTransactionDocuments(txn.id)}
                      lenderEmail={user.email}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <Tabs defaultValue="documents" className="h-[500px]">
              <TabsList className="w-full justify-start border-b rounded-none">
                <TabsTrigger value="documents">
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="messages">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Messages
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="overflow-y-auto h-full">
                <LenderDocumentManager
                  transaction={selectedTransaction}
                  documents={getTransactionDocuments(selectedTransaction.id)}
                  lenderEmail={user.email}
                />
              </TabsContent>

              <TabsContent value="messages" className="h-full">
                <MessageThread
                  transactionId={selectedTransaction.id}
                  currentUserEmail={user.email}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}