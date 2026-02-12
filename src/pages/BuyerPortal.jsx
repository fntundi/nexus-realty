import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, MessageSquare, FileText, Upload, ListChecks, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import MessageThread from '../components/messaging/MessageThread';
import TaskManager from '../components/tasks/TaskManager';
import ShowingScheduler from '../components/showings/ShowingScheduler';
import DocumentManager from '../components/documents/DocumentManager';

export default function BuyerPortal() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['buyer-transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ buyer_email: user?.email }, '-created_date'),
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
    return documents.filter(d => d.transaction_id === transactionId);
  };

  const stageBadgeColors = {
    pre_qual: 'bg-yellow-100 text-yellow-800',
    showing: 'bg-blue-100 text-blue-800',
    offer: 'bg-purple-100 text-purple-800',
    under_contract: 'bg-orange-100 text-orange-800',
    closing: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800'
  };

  const stageProgress = {
    pre_qual: 20,
    showing: 40,
    offer: 60,
    under_contract: 80,
    closing: 95,
    closed: 100
  };

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
          <h1 className="text-3xl font-bold text-slate-900">My Home Journey</h1>
          <p className="text-slate-600 mt-1">Track your transactions and communicate with your agent</p>
        </div>

        <div className="grid gap-6">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No active transactions</p>
                <p className="text-sm mt-2">Start by browsing properties and contacting an agent</p>
              </CardContent>
            </Card>
          ) : (
            transactions.map((transaction) => {
              const property = getProperty(transaction.property_id);
              const transactionDocs = getTransactionDocuments(transaction.id);
              const progress = stageProgress[transaction.current_stage] || 0;

              return (
                <Card key={transaction.id} className="overflow-hidden">
                  <div className="h-2 bg-slate-100">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">
                          {property ? property.address : 'Property Selection In Progress'}
                        </CardTitle>
                        {property && (
                          <p className="text-sm text-slate-600 mt-1">
                            {property.city}, {property.state} • {property.bedrooms} bed, {property.bathrooms} bath
                          </p>
                        )}
                      </div>
                      <Badge className={stageBadgeColors[transaction.current_stage]}>
                        {transaction.current_stage.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {property?.price && (
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-600">List Price:</span>
                        <span className="text-lg font-semibold text-slate-900">
                          ${property.price.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {transaction.contract_price && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-slate-600">Contract Price:</span>
                        <span className="text-lg font-semibold text-blue-900">
                          ${transaction.contract_price.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {transaction.closing_date && (
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-600">Expected Closing:</span>
                        <span className="font-medium text-slate-900">
                          {format(new Date(transaction.closing_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setMessageDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message Agent
                      </Button>
                      <Button className="flex-1" variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        Documents ({transactionDocs.length})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <Tabs defaultValue="messages" className="h-[500px]">
                <TabsList>
                  <TabsTrigger value="messages">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    <ListChecks className="w-4 h-4 mr-2" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="showings">
                    <Calendar className="w-4 h-4 mr-2" />
                    Showings
                  </TabsTrigger>
                  <TabsTrigger value="documents">
                    <FileText className="w-4 h-4 mr-2" />
                    Documents
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="messages" className="h-full">
                  <MessageThread
                    transactionId={selectedTransaction.id}
                    currentUserEmail={user.email}
                  />
                </TabsContent>
                <TabsContent value="tasks" className="overflow-y-auto h-full">
                  <TaskManager
                    transaction={selectedTransaction}
                    currentUser={user}
                    userRole="buyer"
                  />
                </TabsContent>
                <TabsContent value="showings" className="overflow-y-auto h-full">
                  <ShowingScheduler
                    transaction={selectedTransaction}
                    currentUser={user}
                    userRole="buyer"
                  />
                </TabsContent>
                <TabsContent value="documents" className="overflow-y-auto h-full">
                  <DocumentManager
                    transaction={selectedTransaction}
                    currentUser={user}
                    userRole="buyer"
                  />
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}