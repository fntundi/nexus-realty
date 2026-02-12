import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Briefcase, MessageSquare, FileText, CheckCircle2, ListChecks, Calendar, RefreshCw } from 'lucide-react';
import MessageThread from '../components/messaging/MessageThread';
import TaskManager from '../components/tasks/TaskManager';
import ShowingScheduler from '../components/showings/ShowingScheduler';
import DocumentManager from '../components/documents/DocumentManager';
import KeyMetrics from '../components/agent/KeyMetrics';
import ProactiveAlerts from '../components/agent/ProactiveAlerts';
import AIInsights from '../components/agent/AIInsights';

export default function AgentTransactions() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: agent } = useQuery({
    queryKey: ['agent', user?.email],
    queryFn: () => base44.entities.Agent.filter({ user_email: user?.email }).then(a => a[0]),
    enabled: !!user
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['agent-transactions', agent?.id],
    queryFn: () => base44.entities.Transaction.filter({ agent_id: agent?.id }, '-created_date'),
    enabled: !!agent
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['agent-insights', agent?.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateAgentInsights', {
        agent_id: agent.id
      });
      return response.data;
    },
    enabled: !!agent,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const getProperty = (propertyId) => {
    return properties.find(p => p.id === propertyId);
  };

  const handleViewTransaction = (transactionId) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
      setSelectedTransaction(transaction);
      setMessageDialogOpen(true);
    }
  };

  const getUnreadCount = (transactionId) => {
    // This would need to be implemented with a query for messages
    return 0;
  };

  const stageBadgeColors = {
    pre_qual: 'bg-yellow-100 text-yellow-800',
    showing: 'bg-blue-100 text-blue-800',
    offer: 'bg-purple-100 text-purple-800',
    under_contract: 'bg-orange-100 text-orange-800',
    closing: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800'
  };

  if (!user || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Dashboard</h1>
            <p className="text-slate-600 mt-1">AI-powered insights and transaction management</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchInsights()}
            disabled={insightsLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${insightsLoading ? 'animate-spin' : ''}`} />
            Refresh Insights
          </Button>
        </div>

        {insights && (
          <>
            <KeyMetrics metrics={insights.metrics} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProactiveAlerts 
                alerts={insights.alerts} 
                properties={properties}
                onViewTransaction={handleViewTransaction}
              />
              <AIInsights insights={insights.insights} />
            </div>
          </>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Active Transactions</h2>
        </div>

        <div className="grid gap-4">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No active transactions</p>
              </CardContent>
            </Card>
          ) : (
            transactions.map((transaction) => {
              const property = getProperty(transaction.property_id);
              const unreadCount = getUnreadCount(transaction.id);

              return (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {property ? property.address : 'Property TBD'}
                          </h3>
                          <Badge className={stageBadgeColors[transaction.current_stage]}>
                            {transaction.current_stage.replace(/_/g, ' ')}
                          </Badge>
                          {transaction.status !== 'active' && (
                            <Badge variant="outline">{transaction.status}</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                          <div>
                            <span className="text-slate-500">Buyer:</span>
                            <div className="font-medium">{transaction.buyer_email}</div>
                          </div>
                          {transaction.lender_email && (
                            <div>
                              <span className="text-slate-500">Lender:</span>
                              <div className="font-medium">{transaction.lender_email}</div>
                            </div>
                          )}
                          {transaction.contract_price && (
                            <div>
                              <span className="text-slate-500">Contract Price:</span>
                              <div className="font-medium">
                                ${transaction.contract_price.toLocaleString()}
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
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
                          )}
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
                    userRole="agent"
                  />
                </TabsContent>
                <TabsContent value="showings" className="overflow-y-auto h-full">
                  <ShowingScheduler
                    transaction={selectedTransaction}
                    currentUser={user}
                    userRole="agent"
                  />
                </TabsContent>
                <TabsContent value="documents" className="overflow-y-auto h-full">
                  <DocumentManager
                    transaction={selectedTransaction}
                    currentUser={user}
                    userRole="agent"
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