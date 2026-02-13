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
import PropertySearchFilters from '../components/search/PropertySearchFilters';
import SaveSearchDialog from '../components/search/SaveSearchDialog';
import SavedSearchesList from '../components/search/SavedSearchesList';
import MarketDataWidget from '../components/market/MarketDataWidget';

export default function PropertySearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [filters, setFilters] = useState({
    price_range: [0, 2000000],
    bedrooms: [0, 6],
    bathrooms: [0, 6],
    property_types: [],
    amenities: [],
    location_keyword: ''
  });

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

    // Price filter
    const matchesPrice = property.price >= filters.price_range[0] && property.price <= filters.price_range[1];

    // Bedrooms filter
    const matchesBedrooms = property.bedrooms >= filters.bedrooms[0] && property.bedrooms <= filters.bedrooms[1];

    // Bathrooms filter
    const matchesBathrooms = property.bathrooms >= filters.bathrooms[0] && property.bathrooms <= filters.bathrooms[1];

    // Property type filter
    const matchesType = filters.property_types.length === 0 || filters.property_types.includes(property.property_type);

    // Location filter
    const matchesLocation = !filters.location_keyword || 
      property.address?.toLowerCase().includes(filters.location_keyword.toLowerCase()) ||
      property.city?.toLowerCase().includes(filters.location_keyword.toLowerCase());

    return matchesSearch && matchesMarket && matchesType && matchesPrice && matchesBedrooms && matchesBathrooms && matchesLocation;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMarket('all');
    setFilters({
      price_range: [0, 2000000],
      bedrooms: [0, 6],
      bathrooms: [0, 6],
      property_types: [],
      amenities: [],
      location_keyword: ''
    });
  };

  const handleLoadSearch = (savedSearch) => {
    setSelectedMarket(savedSearch.market_id || 'all');
    setFilters(savedSearch.filters);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-slate-900">Find Your Dream Home</h1>
            {user && (
              <div className="flex gap-2">
                <SaveSearchDialog filters={filters} marketId={selectedMarket} user={user} />
              </div>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-3">
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

          <div className="text-sm text-slate-600 mt-3">
            Market: <span className="font-medium">{markets.find(m => m.id === selectedMarket)?.name || 'All Markets'}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <PropertySearchFilters 
            filters={filters} 
            onFiltersChange={setFilters}
            onSearch={() => {}}
            isLoading={isLoading}
          />
          
          <div className="mt-6">
            <SavedSearchesList user={user} onLoadSearch={handleLoadSearch} />
          </div>

          {/* Market Insights for Selected Area */}
          {filteredProperties.length > 0 && (
            <div className="mt-6">
              <MarketDataWidget 
                address={filteredProperties[0]?.address}
                zipCode={filteredProperties[0]?.zip_code}
              />
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">
              {isLoading ? 'Loading...' : `${filteredProperties.length} properties found`}
            </h2>
            <p className="text-sm text-slate-600">
              ${filters.price_range[0].toLocaleString()} - ${filters.price_range[1].toLocaleString()} • 
              {filters.bedrooms[0]}-{filters.bedrooms[1]}+ beds • 
              {filters.bathrooms[0]}-{filters.bathrooms[1]}+ baths
            </p>
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
    </div>
  );
}