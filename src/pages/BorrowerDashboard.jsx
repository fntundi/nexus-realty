import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import LoanProgressTracker from '@/components/borrower/LoanProgressTracker';
import BorrowerDocumentPortal from '@/components/borrower/BorrowerDocumentPortal';
import LoanAssistantChatbot from '@/components/borrower/LoanAssistantChatbot';

export default function BorrowerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setUserEmail(user?.email);
    };
    fetchUser();
  }, []);

  // Fetch borrower's transactions (loan applications)
  const { data: transactions = [], isLoading: transLoading } = useQuery({
    queryKey: ['borrower-transactions', userEmail],
    queryFn: () => base44.entities.Transaction.filter({ buyer_email: userEmail }, '-created_date'),
    enabled: !!userEmail
  });

  // Fetch documents for borrower's transactions
  const { data: documents = [] } = useQuery({
    queryKey: ['borrower-documents', transactions.map(t => t.id).join(',')],
    queryFn: async () => {
      const transactionIds = transactions.map(t => t.id);
      if (transactionIds.length === 0) return [];
      const docs = await base44.entities.Document.list('-created_date');
      return docs.filter(d => transactionIds.includes(d.transaction_id));
    },
    enabled: transactions.length > 0
  });

  // Fetch messages for borrower's transactions
  const { data: messages = [] } = useQuery({
    queryKey: ['borrower-messages', transactions.map(t => t.id).join(',')],
    queryFn: async () => {
      const transactionIds = transactions.map(t => t.id);
      if (transactionIds.length === 0) return [];
      const msgs = await base44.entities.Message.list('-created_date');
      return msgs.filter(m => transactionIds.includes(m.transaction_id) && m.recipient_email === userEmail);
    },
    enabled: transactions.length > 0
  });

  if (!userEmail) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  const activeTransaction = transactions[0];
  const pendingDocuments = documents.filter(d => d.status === 'pending');
  const unreadMessages = messages.filter(m => !m.read);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Your Loan Application</h1>
          <p className="text-slate-600">Track your progress, upload documents, and get instant support</p>
        </div>

        {/* Quick Stats - Clickable */}
        {activeTransaction && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setActiveTab('overview')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Loan Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  ${(activeTransaction.loan_amount / 1000).toFixed(0)}K
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setActiveTab('overview')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Application Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {activeTransaction.status === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="font-semibold text-slate-900 capitalize">
                    {activeTransaction.status || 'In Review'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setActiveTab('documents')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {documents.filter(d => d.status === 'received').length}/{documents.length}
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setActiveTab('messages')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">New Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{unreadMessages.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Progress
            </div>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </div>
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === 'messages'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages {unreadMessages.length > 0 && `(${unreadMessages.length})`}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === 'assistant'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </div>
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && activeTransaction && (
            <LoanProgressTracker transaction={activeTransaction} documents={documents} />
          )}

          {activeTab === 'documents' && activeTransaction && (
            <BorrowerDocumentPortal transactionId={activeTransaction.id} />
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Messages from Lenders & Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No messages yet</p>
                  ) : (
                    <div className="space-y-4">
                      {messages.map(msg => (
                        <div key={msg.id} className={`p-4 border rounded-lg ${!msg.read ? 'bg-blue-50' : 'bg-slate-50'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-slate-900">{msg.sender_name || msg.sender_email}</p>
                              <p className="text-sm text-slate-500">{new Date(msg.created_date).toLocaleDateString()}</p>
                            </div>
                            {!msg.read && <AlertCircle className="w-4 h-4 text-blue-600" />}
                          </div>
                          <p className="text-slate-700">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'assistant' && (
            <LoanAssistantChatbot transactionId={activeTransaction?.id} borrowerEmail={userEmail} />
          )}
        </div>
      </div>
    </div>
  );
}