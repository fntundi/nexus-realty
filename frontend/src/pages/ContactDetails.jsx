import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Mail, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ContactActivityFeed from '../components/crm/ContactActivityFeed';
import InteractionLogger from '../components/crm/InteractionLogger';
import LeadScoreDisplay from '../components/crm/LeadScoreDisplay';
import ContactEmailHistory from '../components/crm/ContactEmailHistory';
import ContactSegmentMembership from '../components/crm/ContactSegmentMembership';
import ScheduleTaskDialog from '../components/tasks/ScheduleTaskDialog';
import TaskCard from '../components/tasks/TaskCard';
import UnifiedCommunicationHub from '../components/communication/UnifiedCommunicationHub';
import ClientOnboardingProgress from '../components/onboarding/ClientOnboardingProgress';
import CommunicationHistoryTimeline from '../components/communication/CommunicationHistoryTimeline';
import AIFollowUpSuggestions from '../components/ai/AIFollowUpSuggestions';
import AIInteractionSummary from '../components/ai/AIInteractionSummary';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const urlParams = new URLSearchParams(window.location.search);
const contactId = urlParams.get('id');

export default function ContactDetails() {
  const navigate = useNavigate();
  const [showInteractionForm, setShowInteractionForm] = useState(false);

  const { data: contact, isLoading: contactLoading, refetch: refetchContact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => base44.entities.Contact.get(contactId),
    enabled: !!contactId
  });

  const { data: interactions = [], refetch: refetchInteractions } = useQuery({
    queryKey: ['interactions', contactId],
    queryFn: () => base44.entities.Interaction.filter({ contact_id: contactId }, '-interaction_date'),
    enabled: !!contactId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['contactTasks', contactId],
    queryFn: () => base44.entities.Task.filter({ contact_id: contactId }, '-due_date'),
    enabled: !!contactId
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['contactTransactions', contact?.email],
    queryFn: () => base44.entities.Transaction.filter({ buyer_email: contact.email }),
    enabled: !!contact?.email
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['contactLeads', contact?.email],
    queryFn: () => base44.entities.Lead.filter({ buyer_email: contact.email }),
    enabled: !!contact?.email
  });

  const upcomingTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.due_date) >= new Date());

  const handleInteractionSuccess = () => {
    setShowInteractionForm(false);
    refetchInteractions();
    refetchContact();
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      prospect: 'bg-blue-100 text-blue-800'
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    const variants = {
      buyer: 'bg-purple-100 text-purple-800',
      seller: 'bg-orange-100 text-orange-800',
      lender: 'bg-indigo-100 text-indigo-800',
      other: 'bg-slate-100 text-slate-800'
    };
    return <Badge className={variants[type]}>{type}</Badge>;
  };

  if (contactLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={() => navigate(createPageUrl('Contacts'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contacts
          </Button>
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">Contact not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Button variant="outline" onClick={() => navigate(createPageUrl('Contacts'))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contacts
        </Button>

        {/* Lead Score and Contact Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {contact.lead_score > 0 && (
            <LeadScoreDisplay 
              leadScore={contact.lead_score} 
              scoreBreakdown={contact.score_breakdown}
            />
          )}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                      {contact.first_name} {contact.last_name}
                    </h1>
                    <div className="flex gap-2 mt-3">
                      {getStatusBadge(contact.status)}
                      {getTypeBadge(contact.contact_type)}
                    </div>
                  </div>
                  <Dialog open={showInteractionForm} onOpenChange={setShowInteractionForm}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Log Interaction
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Log Interaction with {contact.first_name}</DialogTitle>
                      </DialogHeader>
                      <InteractionLogger 
                        contactId={contact.id}
                        onSuccess={handleInteractionSuccess}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {contact.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.company && (
                      <div className="text-slate-700">
                        <span className="text-slate-500">Company: </span>
                        {contact.company}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {contact.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-slate-700">{contact.address}</p>
                          {(contact.city || contact.state || contact.zip_code) && (
                            <p className="text-slate-600 text-sm">
                              {[contact.city, contact.state, contact.zip_code].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {contact.assigned_agent_email && (
                      <div className="text-slate-700">
                        <span className="text-slate-500">Assigned Agent: </span>
                        {contact.assigned_agent_email}
                      </div>
                    )}
                  </div>
                </div>
                {contact.notes && (
                  <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600"><strong>Notes:</strong></p>
                    <p className="text-slate-700 mt-1">{contact.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Assistant Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AIInteractionSummary 
            contact={contact}
            interactions={interactions}
            transactions={transactions}
          />
          <AIFollowUpSuggestions
            contact={contact}
            interactions={interactions}
            lead={leads[0]}
          />
        </div>

        {/* Communication History Timeline */}
        <CommunicationHistoryTimeline interactions={interactions} />

        {/* Communication Hub */}
        <UnifiedCommunicationHub 
          contact={contact} 
          transaction={transactions[0]}
        />

        {/* Onboarding Progress */}
        <ClientOnboardingProgress contactId={contactId} />

        {/* Tabs for Activity and Related Records */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList>
            <TabsTrigger value="tasks">Tasks ({upcomingTasks.length})</TabsTrigger>
            <TabsTrigger value="emails">Email Campaigns</TabsTrigger>
            <TabsTrigger value="segments">Segment Membership</TabsTrigger>
            <TabsTrigger value="related">Related Records</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="space-y-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule Task for {contact.first_name}</DialogTitle>
                </DialogHeader>
                <ScheduleTaskDialog
                  contactId={contact.id}
                  contactEmail={contact.email}
                  onSuccess={() => refetchContact()}
                />
              </DialogContent>
            </Dialog>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-4">
                {upcomingTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  No upcoming tasks scheduled for this contact
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="emails">
            <ContactEmailHistory contactEmail={contact.email} />
          </TabsContent>
          <TabsContent value="segments">
            <ContactSegmentMembership contact={contact} />
          </TabsContent>
          <TabsContent value="related">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Related Leads</h3>
                    {contact.related_lead_ids && contact.related_lead_ids.length > 0 ? (
                      <div className="space-y-2">
                        {contact.related_lead_ids.map(leadId => (
                          <div key={leadId} className="p-2 bg-slate-50 rounded border border-slate-200 text-sm text-slate-600">
                            Lead ID: {leadId}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No related leads</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Related Transactions</h3>
                    {contact.related_transaction_ids && contact.related_transaction_ids.length > 0 ? (
                      <div className="space-y-2">
                        {contact.related_transaction_ids.map(txnId => (
                          <div key={txnId} className="p-2 bg-slate-50 rounded border border-slate-200 text-sm text-slate-600">
                            Transaction ID: {txnId}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No related transactions</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}