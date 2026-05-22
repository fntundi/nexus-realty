import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Eye, Loader2, Home } from 'lucide-react';
import PropertyCard from '../properties/PropertyCard';
import { toast } from 'sonner';

export default function AIPropertyRecommendations({ currentUser, currentProperty }) {
  const [recommendations, setRecommendations] = useState(null);

  const { data: viewingHistory = [] } = useQuery({
    queryKey: ['viewing-history', currentUser?.email],
    queryFn: () => base44.entities.ViewingHistory.filter(
      { user_email: currentUser?.email },
      '-viewed_at',
      20
    ),
    enabled: !!currentUser
  });

  const { data: allProperties = [] } = useQuery({
    queryKey: ['all-properties'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' })
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const viewedProperties = viewingHistory.map(vh => {
        const prop = allProperties.find(p => p.id === vh.property_id);
        return prop ? {
          id: prop.id,
          address: prop.address,
          price: prop.price,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          square_feet: prop.square_feet,
          property_type: prop.property_type,
          city: prop.city
        } : null;
      }).filter(Boolean);

      const prompt = `You are an AI real estate assistant. Analyze this buyer's viewing history and recommend similar properties.

Viewing History (${viewedProperties.length} properties):
${viewedProperties.map((p, i) => `${i + 1}. ${p.address} - $${p.price?.toLocaleString()} | ${p.bedrooms}bed/${p.bathrooms}bath | ${p.square_feet}sqft | ${p.property_type} in ${p.city}`).join('\n')}

Available Properties:
${allProperties.slice(0, 30).map(p => `ID: ${p.id} | ${p.address} - $${p.price?.toLocaleString()} | ${p.bedrooms}bed/${p.bathrooms}bath | ${p.square_feet}sqft | ${p.property_type} in ${p.city}`).join('\n')}

Based on the viewing history patterns, recommend 5-8 properties that would best match the buyer's preferences. Consider:
- Price range they've been viewing
- Preferred number of bedrooms/bathrooms
- Property types they favor
- Location preferences
- Size preferences

Return property IDs and match reasoning in JSON format.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  property_id: { type: "string" },
                  match_score: { type: "number" },
                  reasoning: { type: "string" },
                  key_features: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            buyer_preferences_summary: { type: "string" }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      setRecommendations(data);
      toast.success('AI recommendations generated');
    },
    onError: () => {
      toast.error('Failed to generate recommendations');
    }
  });

  if (!currentUser) {
    return null;
  }

  if (!viewingHistory || viewingHistory.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Eye className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600">
            Start viewing properties to get personalized AI recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Property Recommendations
          </CardTitle>
          {recommendations && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!recommendations ? (
          <div className="text-center py-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600">
                Based on {viewingHistory.length} properties you've viewed
              </span>
            </div>
            <p className="text-slate-600 mb-4">
              Get AI-powered property recommendations tailored to your preferences
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Buyer Preferences Summary */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-purple-900">Your Preferences</h4>
              </div>
              <p className="text-sm text-purple-800">
                {recommendations.buyer_preferences_summary}
              </p>
            </div>

            {/* Recommended Properties */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">
                Top Matches ({recommendations.recommendations?.length || 0})
              </h4>
              <div className="space-y-4">
                {recommendations.recommendations?.map((rec, idx) => {
                  const property = allProperties.find(p => p.id === rec.property_id);
                  if (!property) return null;

                  return (
                    <div key={property.id} className="relative">
                      <Badge 
                        className="absolute -top-2 -left-2 z-10 bg-purple-600"
                      >
                        {rec.match_score}% Match
                      </Badge>
                      
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="flex">
                          <img
                            src={property.photos?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400'}
                            alt={property.address}
                            className="w-32 h-32 object-cover"
                          />
                          <div className="flex-1 p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-semibold text-slate-900">{property.address}</h5>
                                <p className="text-sm text-slate-600">{property.city}, {property.state}</p>
                              </div>
                              <Badge className="bg-blue-600">
                                ${property.price?.toLocaleString()}
                              </Badge>
                            </div>
                            
                            <div className="flex gap-3 text-xs text-slate-600 mb-2">
                              {property.bedrooms && <span>{property.bedrooms} bed</span>}
                              {property.bathrooms && <span>• {property.bathrooms} bath</span>}
                              {property.square_feet && <span>• {property.square_feet.toLocaleString()} sqft</span>}
                            </div>

                            <p className="text-xs text-slate-700 mb-2">{rec.reasoning}</p>
                            
                            {rec.key_features?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {rec.key_features.map((feature, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}