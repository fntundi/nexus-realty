import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Phone, Mail, Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import ContactForm from '../components/crm/ContactForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Contacts() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date')
  });

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = !searchTerm || 
        contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || contact.status === filterStatus;
      const matchesType = filterType === 'all' || contact.contact_type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [contacts, searchTerm, filterStatus, filterType]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-96" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
            <p className="text-slate-600 mt-1">Manage clients and leads</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <ContactForm onSuccess={() => { setShowForm(false); refetch(); }} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="seller">Seller</SelectItem>
                <SelectItem value="lender">Lender</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterType('all'); }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>

        {/* Contacts List */}
        <div className="space-y-3">
          {filteredContacts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No contacts found</p>
              </CardContent>
            </Card>
          ) : (
            filteredContacts.map(contact => (
              <Link key={contact.id} to={createPageUrl('ContactDetails', `id=${contact.id}`)}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          {getStatusBadge(contact.status)}
                          {getTypeBadge(contact.contact_type)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600 mt-3">
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <a href={`mailto:${contact.email}`} className="hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <a href={`tel:${contact.phone}`} className="hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                                {contact.phone}
                              </a>
                            </div>
                          )}
                          {contact.company && (
                            <div className="text-slate-600">{contact.company}</div>
                          )}
                          {contact.last_interaction_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {format(new Date(contact.last_interaction_date), 'MMM d')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        {contact.lead_score > 0 && (
                          <div className="flex items-center justify-end gap-2">
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Score</p>
                              <p className="text-lg font-bold text-slate-900">{contact.lead_score}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
                              <TrendingUp className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                        )}
                        <div className="text-sm text-slate-500">
                          {contact.related_transaction_ids?.length > 0 && (
                            <p>{contact.related_transaction_ids.length} txn(s)</p>
                          )}
                          {contact.related_lead_ids?.length > 0 && (
                            <p>{contact.related_lead_ids.length} lead(s)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Total Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{contacts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{contacts.filter(c => c.status === 'active').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Prospects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{contacts.filter(c => c.status === 'prospect').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-600">{contacts.filter(c => c.status === 'inactive').length}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}