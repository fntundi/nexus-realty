import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, MessageSquare, FileText, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import MessageThread from '../components/messaging/MessageThread';

export default function LenderPortal() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['lender-transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ lender_email: user?.email }, '-created_date'),
    enabled: !!user
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-upload_date')
  });

  const getProperty = (propertyId) => {
    return properties.find(p => p.id === propertyId);
  };

  const getTransactionDocuments = (transactionId) => {
    return documents.filter(d => d.transaction_id === transactionId && d.uploaded_by === user?.email);
  };

  const stageBadgeColors = {
    pre_qual: 'bg-yellow-100 text-yellow-800',
    showing: 'bg-blue-100 text-blue-800',
    offer: 'bg-purple-100 text-purple-800',
    under_contract: 'bg-orange-100 text-orange-800',
    closing: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800'
  };

  const totalLoanAmount = transactions
    .filter(t => t.status === 'active' && t.contract_price)
    .reduce((sum, t) => sum + (t.contract_price * 0.8), 0);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lender Dashboard</h1>
          <p className="text-slate-600 mt-1">Track your deals and communicate with agents and buyers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Deals</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.filter(t => t.status === 'active').length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Pipeline</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalLoanAmount / 1000000).toFixed(1)}M</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Closing Soon</CardTitle>
              <FileText className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transactions.filter(t => t.current_stage === 'closing').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No active deals</p>
              </CardContent>
            </Card>
          ) : (
            transactions.map((transaction) => {
              const property = getProperty(transaction.property_id);
              const myDocs = getTransactionDocuments(transaction.id);

              return (
                <Card key={transaction.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {property ? property.address : 'Property TBD'}
                          </h3>
                          <Badge className={stageBadgeColors[transaction.current_stage]}>
                            {transaction.current_stage.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Buyer:</span>
                            <div className="font-medium">{transaction.buyer_email}</div>
                          </div>
                          {transaction.contract_price && (
                            <div>
                              <span className="text-slate-500">Loan Amount (est.):</span>
                              <div className="font-medium">
                                ${(transaction.contract_price * 0.8).toLocaleString()}
                              </div>
                            </div>
                          )}
                          {transaction.closing_date && (
                            <div>
                              <span className="text-slate-500">Closing Date:</span>
                              <div className="font-medium">
                                {format(new Date(transaction.closing_date), 'MMM d, yyyy')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setMessageDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Messages
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          My Docs ({myDocs.length})
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent className="max-w-4xl h-[600px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Deal Communication</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <MessageThread
                transactionId={selectedTransaction.id}
                currentUserEmail={user.email}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}