import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ContactForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    contact_type: 'other',
    status: 'prospect',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      toast.success('Contact created successfully');
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        contact_type: 'other',
        status: 'prospect',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        notes: ''
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Failed to create contact');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('First name, last name, and email are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name" className="text-sm mb-1 block">First Name *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            placeholder="John"
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="last_name" className="text-sm mb-1 block">Last Name *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            placeholder="Doe"
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" className="text-sm mb-1 block">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="john@example.com"
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="phone" className="text-sm mb-1 block">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="(555) 123-4567"
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contact_type" className="text-sm mb-1 block">Contact Type</Label>
          <Select value={formData.contact_type} onValueChange={(value) => setFormData({...formData, contact_type: value})}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="lender">Lender</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status" className="text-sm mb-1 block">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="company" className="text-sm mb-1 block">Company</Label>
        <Input
          id="company"
          value={formData.company}
          onChange={(e) => setFormData({...formData, company: e.target.value})}
          placeholder="Company name"
          className="h-8"
        />
      </div>

      <div>
        <Label htmlFor="address" className="text-sm mb-1 block">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          placeholder="123 Main St"
          className="h-8"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city" className="text-sm mb-1 block">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
            placeholder="Austin"
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="state" className="text-sm mb-1 block">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({...formData, state: e.target.value})}
            placeholder="TX"
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="zip_code" className="text-sm mb-1 block">Zip Code</Label>
          <Input
            id="zip_code"
            value={formData.zip_code}
            onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
            placeholder="78701"
            className="h-8"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes" className="text-sm mb-1 block">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Any additional notes..."
          className="h-20"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create Contact'}
      </Button>
    </form>
  );
}