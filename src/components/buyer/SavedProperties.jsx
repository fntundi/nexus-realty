import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Trash2, Home, MapPin, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function SavedProperties({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', userEmail],
    queryFn: () => base44.entities.Favorite.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['favorite-properties', favorites.map(f => f.property_id).join(',')],
    queryFn: async () => {
      if (favorites.length === 0) return [];
      const propertyIds = favorites.map(f => f.property_id);
      const allProps = await base44.entities.Property.list();
      return allProps.filter(p => propertyIds.includes(p.id));
    },
    enabled: favorites.length > 0
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId) => base44.entities.Favorite.delete(favoriteId),
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
      toast.success('Property removed from favorites');
    }
  });

  const getFavoriteForProperty = (propertyId) => {
    return favorites.find(f => f.property_id === propertyId);
  };

  if (favorites.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Heart className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-600 text-center">No saved properties yet</p>
          <p className="text-sm text-slate-500 text-center mt-2">
            Start exploring properties and save your favorites
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {properties.map(property => {
        const favorite = getFavoriteForProperty(property.id);
        return (
          <Card key={property.id} className="overflow-hidden">
            {property.photos?.[0] && (
              <div className="h-48 overflow-hidden">
                <img 
                  src={property.photos[0]} 
                  alt={property.address}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    ${property.price.toLocaleString()}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-sm text-slate-600 mt-1">
                    <MapPin className="w-3 h-3" />
                    {property.address}, {property.city}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFavoriteMutation.mutate(favorite.id)}
                >
                  <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm mb-3">
                <span>{property.bedrooms} beds</span>
                <span>{property.bathrooms} baths</span>
                <span>{property.square_feet?.toLocaleString()} sqft</span>
              </div>

              {favorite?.rating && (
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i}
                      className={`w-4 h-4 ${i < favorite.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                    />
                  ))}
                </div>
              )}

              {favorite?.tags?.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {favorite.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}

              {favorite?.notes && (
                <p className="text-sm text-slate-600 italic mb-3">
                  "{favorite.notes}"
                </p>
              )}

              <Button className="w-full" variant="outline">
                <Home className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}