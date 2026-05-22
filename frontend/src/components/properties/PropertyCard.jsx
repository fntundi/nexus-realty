import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bed, Bath, Maximize, MapPin, Heart, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function PropertyCard({ property, currentUser }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const queryClient = useQueryClient();

  const createLeadMutation = useMutation({
    mutationFn: async (propertyId) => {
      const leadData = {
        market_id: property.market_id,
        buyer_email: currentUser?.email,
        buyer_name: currentUser?.full_name,
        buyer_phone: '',
        source: 'property_inquiry',
        property_id: propertyId,
        status: 'unassigned',
        notes: `Interested in ${property.address}`
      };
      return base44.entities.Lead.create(leadData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Interest submitted! An agent will contact you soon.');
    }
  });

  const typeLabels = {
    single_family: 'Single Family',
    condo: 'Condo',
    townhouse: 'Townhouse',
    multi_family: 'Multi Family',
    land: 'Land'
  };

  const primaryPhoto = property.photos?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800';

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setDetailsOpen(true)}>
        <div className="relative">
          <img
            src={primaryPhoto}
            alt={property.address}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-3 right-3">
            <Badge className="bg-blue-600 text-white">
              ${property.price?.toLocaleString()}
            </Badge>
          </div>
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="bg-white">
              {typeLabels[property.property_type] || property.property_type}
            </Badge>
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 line-clamp-1">{property.address}</h3>
              <div className="flex items-center text-sm text-slate-600 mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                {property.city}, {property.state}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600 mt-3">
            {property.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                {property.bedrooms} bed
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                {property.bathrooms} bath
              </div>
            )}
            {property.square_feet && (
              <div className="flex items-center gap-1">
                <Maximize className="w-4 h-4" />
                {property.square_feet.toLocaleString()} sqft
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{property.address}</DialogTitle>
          </DialogHeader>

          {/* Photo Gallery */}
          <div className="grid grid-cols-2 gap-2">
            {property.photos?.slice(0, 4).map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`${property.address} - ${idx + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            ))}
          </div>

          {/* Price and Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-slate-600 mb-1">Price</div>
              <div className="text-2xl font-bold text-blue-900">
                ${property.price?.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600 mb-1">Property Type</div>
              <div className="text-lg font-semibold">
                {typeLabels[property.property_type] || property.property_type}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            {property.bedrooms && (
              <div className="text-center">
                <Bed className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <div className="font-semibold">{property.bedrooms}</div>
                <div className="text-xs text-slate-600">Bedrooms</div>
              </div>
            )}
            {property.bathrooms && (
              <div className="text-center">
                <Bath className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <div className="font-semibold">{property.bathrooms}</div>
                <div className="text-xs text-slate-600">Bathrooms</div>
              </div>
            )}
            {property.square_feet && (
              <div className="text-center">
                <Maximize className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <div className="font-semibold">{property.square_feet.toLocaleString()}</div>
                <div className="text-xs text-slate-600">Sq Ft</div>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">Location</span>
            </div>
            <div className="text-slate-900">
              {property.address}, {property.city}, {property.state} {property.zip_code}
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 leading-relaxed">{property.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {currentUser && (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => createLeadMutation.mutate(property.id)}
                disabled={createLeadMutation.isPending}
              >
                <Heart className="w-4 h-4 mr-2" />
                I'm Interested
              </Button>
            )}
            <Button variant="outline" className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Showing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}