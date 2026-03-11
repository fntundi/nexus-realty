import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Home, Map, Sparkles, Grid3x3, Eye } from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import AdvancedPropertyFilters from '../components/search/AdvancedPropertyFilters';
import MapSearchView from '../components/search/MapSearchView';
import AIPropertyRecommendations from '../components/search/AIPropertyRecommendations';
import SaveSearchDialog from '../components/search/SaveSearchDialog';
import SavedSearchesList from '../components/search/SavedSearchesList';
import MarketDataWidget from '../components/market/MarketDataWidget';

export default function PropertySearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [customAreaIds, setCustomAreaIds] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [filters, setFilters] = useState({
    price_range: [0, 2000000],
    bedrooms: [0, 6],
    bathrooms: [0, 6],
    square_feet: [0, 5000],
    property_types: [],
    amenities: [],
    location_keyword: '',
    school_district: '',
    lot_size_min: 0,
    year_built_min: 1900,
    hoa_max: 1000,
    parking_spaces: 0
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

  // Track property views
  const trackViewMutation = useMutation({
    mutationFn: async (propertyId) => {
      if (!user?.email) return;
      return base44.entities.ViewingHistory.create({
        user_email: user.email,
        property_id: propertyId,
        viewed_at: new Date().toISOString(),
        viewing_duration_seconds: 0
      });
    }
  });

  const filteredProperties = properties.filter(property => {
    // Custom area filter (from map drawing)
    if (customAreaIds && !customAreaIds.includes(property.id)) {
      return false;
    }

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

    // Square footage filter
    const matchesSquareFeet = !filters.square_feet || 
      (property.square_feet >= filters.square_feet[0] && property.square_feet <= filters.square_feet[1]);

    // Property type filter
    const matchesType = filters.property_types.length === 0 || filters.property_types.includes(property.property_type);

    // School district filter
    const matchesSchool = !filters.school_district || property.school_district === filters.school_district;

    // Amenities filter
    const matchesAmenities = filters.amenities.length === 0 || 
      filters.amenities.every(amenity => property.amenities?.includes(amenity));

    // Location filter
    const matchesLocation = !filters.location_keyword || 
      property.address?.toLowerCase().includes(filters.location_keyword.toLowerCase()) ||
      property.city?.toLowerCase().includes(filters.location_keyword.toLowerCase());

    return matchesSearch && matchesMarket && matchesType && matchesPrice && 
           matchesBedrooms && matchesBathrooms && matchesSquareFeet && 
           matchesSchool && matchesAmenities && matchesLocation;
  });

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    trackViewMutation.mutate(property.id);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMarket('all');
    setCustomAreaIds(null);
    setFilters({
      price_range: [0, 2000000],
      bedrooms: [0, 6],
      bathrooms: [0, 6],
      square_feet: [0, 5000],
      property_types: [],
      amenities: [],
      location_keyword: '',
      school_district: '',
      lot_size_min: 0,
      year_built_min: 1900,
      hoa_max: 1000,
      parking_spaces: 0
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
            <div className="flex items-center gap-3">
              {user && <SaveSearchDialog filters={filters} marketId={selectedMarket} user={user} />}
              
              <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
                <TabsList>
                  <TabsTrigger value="grid" className="gap-2">
                    <Grid3x3 className="w-4 h-4" />
                    Grid
                  </TabsTrigger>
                  <TabsTrigger value="map" className="gap-2">
                    <Map className="w-4 h-4" />
                    Map
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Match
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
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
            <Button onClick={resetFilters} variant="outline">Clear All</Button>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
            <span>Market: <span className="font-medium">{markets.find(m => m.id === selectedMarket)?.name || 'All Markets'}</span></span>
            {customAreaIds && (
              <Badge variant="outline" className="gap-1">
                <Map className="w-3 h-3" />
                Custom Area Active
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          {viewMode !== 'ai' && (
            <div className="lg:col-span-1">
              <AdvancedPropertyFilters 
                filters={filters} 
                onFiltersChange={setFilters}
                onSearch={() => {}}
                isLoading={isLoading}
              />
              
              <div className="mt-6">
                <SavedSearchesList user={user} onLoadSearch={handleLoadSearch} />
              </div>

              {filteredProperties.length > 0 && viewMode === 'grid' && (
                <div className="mt-6">
                  <MarketDataWidget 
                    address={filteredProperties[0]?.address}
                    zipCode={filteredProperties[0]?.zip_code}
                  />
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className={viewMode === 'ai' ? 'lg:col-span-4' : 'lg:col-span-3'}>
            {viewMode === 'grid' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    {isLoading ? 'Loading...' : `${filteredProperties.length} properties found`}
                  </h2>
                  <p className="text-sm text-slate-600">
                    ${filters.price_range[0].toLocaleString()} - ${filters.price_range[1].toLocaleString()} • 
                    {filters.bedrooms[0]}-{filters.bedrooms[1]}+ beds • 
                    {filters.bathrooms[0]}-{filters.bathrooms[1]}+ baths
                    {filters.school_district && ` • ${filters.school_district}`}
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
                      <p className="text-sm mt-2">Try adjusting your filters or clearing custom area</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProperties.map(property => (
                      <div key={property.id} onClick={() => handlePropertyClick(property)}>
                        <PropertyCard property={property} currentUser={user} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {viewMode === 'map' && (
              <div className="h-[calc(100vh-250px)]">
                <MapSearchView
                  properties={filteredProperties}
                  onPropertyClick={handlePropertyClick}
                  onAreaFilter={setCustomAreaIds}
                />
              </div>
            )}

            {viewMode === 'ai' && (
              <div className="max-w-4xl mx-auto">
                <AIPropertyRecommendations 
                  currentUser={user}
                  currentProperty={selectedProperty}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}