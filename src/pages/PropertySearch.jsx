import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Search, Home, Bed, Bath, Maximize, MapPin, Heart, Calendar } from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';

export default function PropertySearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [propertyType, setPropertyType] = useState('all');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2000000);
  const [bedrooms, setBedrooms] = useState('any');
  const [bathrooms, setBathrooms] = useState('any');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' }, '-created_date')
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const filteredProperties = properties.filter(property => {
    // Search term filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      property.address?.toLowerCase().includes(searchLower) ||
      property.city?.toLowerCase().includes(searchLower) ||
      property.state?.toLowerCase().includes(searchLower) ||
      property.zip_code?.includes(searchTerm);

    // Market filter
    const matchesMarket = selectedMarket === 'all' || property.market_id === selectedMarket;

    // Property type filter
    const matchesType = propertyType === 'all' || property.property_type === propertyType;

    // Price filter
    const matchesPrice = property.price >= minPrice && property.price <= maxPrice;

    // Bedrooms filter
    const matchesBedrooms = bedrooms === 'any' || property.bedrooms >= parseInt(bedrooms);

    // Bathrooms filter
    const matchesBathrooms = bathrooms === 'any' || property.bathrooms >= parseInt(bathrooms);

    return matchesSearch && matchesMarket && matchesType && matchesPrice && matchesBedrooms && matchesBathrooms;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMarket('all');
    setPropertyType('all');
    setMinPrice(0);
    setMaxPrice(2000000);
    setBedrooms('any');
    setBathrooms('any');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Find Your Dream Home</h1>
          
          {/* Search Bar */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by address, city, or zip code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={resetFilters} variant="outline">Clear Filters</Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger>
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map(market => (
                  <SelectItem key={market.id} value={market.id}>
                    {market.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger>
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="single_family">Single Family</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="multi_family">Multi Family</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bedrooms} onValueChange={setBedrooms}>
              <SelectTrigger>
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Beds</SelectItem>
                <SelectItem value="1">1+ Beds</SelectItem>
                <SelectItem value="2">2+ Beds</SelectItem>
                <SelectItem value="3">3+ Beds</SelectItem>
                <SelectItem value="4">4+ Beds</SelectItem>
                <SelectItem value="5">5+ Beds</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bathrooms} onValueChange={setBathrooms}>
              <SelectTrigger>
                <SelectValue placeholder="Bathrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Baths</SelectItem>
                <SelectItem value="1">1+ Baths</SelectItem>
                <SelectItem value="2">2+ Baths</SelectItem>
                <SelectItem value="3">3+ Baths</SelectItem>
                <SelectItem value="4">4+ Baths</SelectItem>
              </SelectContent>
            </Select>

            <div className="col-span-2">
              <div className="text-sm text-slate-600 mb-2">
                Price Range: ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}
              </div>
              <Slider
                value={[minPrice, maxPrice]}
                min={0}
                max={2000000}
                step={50000}
                onValueChange={([min, max]) => {
                  setMinPrice(min);
                  setMaxPrice(max);
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-slate-600">
            {isLoading ? 'Loading...' : `${filteredProperties.length} properties found`}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No properties found matching your criteria</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <PropertyCard key={property.id} property={property} currentUser={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}