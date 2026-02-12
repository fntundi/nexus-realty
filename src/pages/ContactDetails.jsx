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

        {/* Contact Info Card */}
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

        {/* Tabs for Activity and Related Records */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList>
            <TabsTrigger value="activity">Activity Feed ({interactions.length})</TabsTrigger>
            <TabsTrigger value="related">Related Records</TabsTrigger>
          </TabsList>
          <TabsContent value="activity">
            <ContactActivityFeed interactions={interactions} />
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