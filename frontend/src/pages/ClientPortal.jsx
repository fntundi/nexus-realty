import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, FileText, MessageSquare, Home, CheckCircle2, Clock, ArrowRight, Mail, Phone, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarketDataWidget from '../components/market/MarketDataWidget';
import ClientDocumentSection from '../components/client/ClientDocumentSection';
import PropertyInquiryForm from '../components/client/PropertyInquiryForm';
import PersonalizedMarketInsights from '../components/client/PersonalizedMarketInsights';

export default function ClientPortal() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: contact } = useQuery({
    queryKey: ['myContact', user?.email],
    queryFn: () => base44.entities.Contact.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0]
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['myTransactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ buyer_email: user.email }),
    enabled: !!user?.email
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks', user?.email],
    queryFn: () => base44.entities.Task.filter({ contact_email: user.email }, '-due_date'),
    enabled: !!user?.email
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['myDocuments', transactions],
    queryFn: async () => {
      const allDocs = [];
      for (const txn of transactions) {
        const docs = await base44.entities.Document.filter({ transaction_id: txn.id });
        allDocs.push(...docs);
      }
      return allDocs;
    },
    enabled: transactions.length > 0
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['myFavorites', user?.email],
    queryFn: () => base44.entities.Favorite.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['favoriteProperties', favorites],
    queryFn: async () => {
      const props = [];
      for (const fav of favorites.slice(0, 4)) {
        const prop = await base44.entities.Property.get(fav.property_id);
        if (prop) props.push(prop);
      }
      return props;
    },
    enabled: favorites.length > 0
  });

  const { data: agent } = useQuery({
    queryKey: ['myAgent', contact?.assigned_agent_email],
    queryFn: async () => {
      const agents = await base44.entities.Agent.filter({ user_email: contact.assigned_agent_email });
      return agents[0];
    },
    enabled: !!contact?.assigned_agent_email
  });

  const { data: onboardingProgress } = useQuery({
    queryKey: ['myOnboarding', contact?.id],
    queryFn: async () => {
      const progress = await base44.entities.OnboardingProgress.filter({ 
        contact_id: contact.id,
        status: 'in_progress'
      });
      return progress[0];
    },
    enabled: !!contact?.id
  });

  const activeTransaction = transactions.find(t => t.status === 'active');
  const upcomingTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.due_date) >= new Date()).slice(0, 5);
  const recentDocs = documents.filter(d => d.access_control?.visible_to_buyer !== false).slice(0, 4);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-96" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.full_name?.split(' ')[0] || 'Client'}!</h1>
          <p className="text-slate-600 mt-1">Here's your personalized dashboard</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Transactions</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{transactions.filter(t => t.status === 'active').length}</p>
                </div>
                <Home className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Upcoming Tasks</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{upcomingTasks.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Documents</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Saved Properties</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{favorites.length}</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tasks & Onboarding */}
          <div className="lg:col-span-2 space-y-6">
            {/* Onboarding Progress */}
            {onboardingProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Getting Started Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-semibold">{onboardingProgress.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${onboardingProgress.completion_percentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-600 mt-3">
                      {onboardingProgress.checklist_progress.filter(i => i.completed).length} of {onboardingProgress.checklist_progress.length} items completed
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Tasks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Upcoming Tasks & Deadlines
                  </CardTitle>
                  {upcomingTasks.length > 0 && (
                    <Badge variant="outline">{upcomingTasks.length} pending</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No upcoming tasks</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          task.priority === 'high' || task.priority === 'critical' ? 'bg-red-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{task.title}</div>
                          {task.description && (
                            <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            Due {format(new Date(task.due_date), 'MMM d, h:mm a')}
                          </div>
                        </div>
                        <Badge className={
                          task.priority === 'high' || task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }>
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents & Signatures */}
            <ClientDocumentSection 
              transactionId={activeTransaction?.id}
              userEmail={user?.email}
            />

            {/* Property Inquiry / Feedback Form */}
            {contact && (
              <PropertyInquiryForm
                contactId={contact.id}
                agentEmail={contact.assigned_agent_email}
                propertyId={activeTransaction?.property_id}
              />
            )}
          </div>

          {/* Right Column - Contacts & Properties */}
          <div className="space-y-6">
            {/* Key Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent */}
                {agent ? (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {contact.assigned_agent_email?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">Your Agent</div>
                        <div className="text-sm text-slate-600">{contact.assigned_agent_email}</div>
                        <div className="flex gap-2 mt-2">
                          <a href={`mailto:${contact.assigned_agent_email}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </Button>
                          </a>
                          {agent.phone && (
                            <a href={`tel:${agent.phone}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                <Phone className="w-3 h-3 mr-1" />
                                Call
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    No agent assigned yet
                  </div>
                )}

                {/* Lender */}
                {activeTransaction?.lender_email && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                        {activeTransaction.lender_email[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">Your Lender</div>
                        <div className="text-sm text-slate-600">{activeTransaction.lender_email}</div>
                        <a href={`mailto:${activeTransaction.lender_email}`} className="mt-2 inline-block">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            <Mail className="w-3 h-3 mr-1" />
                            Email
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Transaction */}
            {activeTransaction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Active Transaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-slate-600">Current Stage</div>
                      <Badge className="mt-1 bg-blue-100 text-blue-800 capitalize">
                        {activeTransaction.current_stage.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {activeTransaction.contract_price && (
                      <div>
                        <div className="text-sm text-slate-600">Contract Price</div>
                        <div className="text-lg font-semibold text-slate-900">
                          ${activeTransaction.contract_price.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {activeTransaction.closing_date && (
                      <div>
                        <div className="text-sm text-slate-600">Closing Date</div>
                        <div className="font-medium text-slate-900">
                          {format(new Date(activeTransaction.closing_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    )}
                    <Button 
                      className="w-full mt-2"
                      onClick={() => navigate(createPageUrl('BuyerPortal'))}
                    >
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Personalized Market Insights */}
            <PersonalizedMarketInsights
              transaction={activeTransaction}
              favoriteProperties={properties}
            />

            {/* Saved Properties */}
            {properties.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Saved Properties
                    </CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => navigate(createPageUrl('PropertySearch'))}>
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {properties.map(property => (
                      <div key={property.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="font-medium text-slate-900">{property.address}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          {property.city}, {property.state}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-lg font-semibold text-blue-600">
                            ${property.price?.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            {property.bedrooms}bd • {property.bathrooms}ba
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate(createPageUrl('PropertySearch'))}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Search Properties
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate(createPageUrl('BuyerPortal'))}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Messages
                </Button>
                {contact?.id && (
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate(createPageUrl('ContactDetails') + `?id=${contact.id}`)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}