import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, DollarSign, BedDouble } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function PropertyRecommendations({ buyerEmail }) {
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['property-recommendations', buyerEmail],
    queryFn: () => base44.entities.PropertyRecommendation.filter(
      { buyer_email: buyerEmail, viewed: false },
      '-recommendation_score'
    ),
    enabled: !!buyerEmail
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties-full'],
    queryFn: () => base44.entities.Property.list()
  });

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          Loading recommendations...
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p>View more properties to get personalized recommendations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.slice(0, 5).map((rec) => {
        const property = getProperty(rec.property_id);
        if (!property) return null;

        return (
          <Card key={rec.id} className="hover:shadow-lg transition-all overflow-hidden border border-gray-200">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Property Image */}
                <div className="w-32 h-32 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {property.image_url && (
                    <img src={property.image_url} alt={property.address} className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Property Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{property.address}</h3>
                      <p className="text-sm text-slate-600">{property.city}, {property.state}</p>
                    </div>
                    <Badge className={getScoreColor(rec.recommendation_score)}>
                      {Math.round(rec.recommendation_score)}% Match
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-700">{rec.reason}</p>

                  {/* Property Meta */}
                  <div className="flex gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${property.price?.toLocaleString() || 'TBD'}
                    </div>
                    {property.bedrooms && (
                      <div className="flex items-center gap-1">
                        <BedDouble className="w-4 h-4" />
                        {property.bedrooms} beds
                      </div>
                    )}
                    {property.square_feet && (
                      <div>{property.square_feet.toLocaleString()} sqft</div>
                    )}
                  </div>

                  <Button size="sm" variant="outline" className="mt-2">
                    View Property
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}