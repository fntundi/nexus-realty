import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Search, X } from 'lucide-react';

export default function PropertySearchFilters({ filters, onFiltersChange, onSearch, isLoading }) {
  const handlePriceChange = (value) => {
    onFiltersChange({ ...filters, price_range: value });
  };

  const handleBedroomChange = (value) => {
    onFiltersChange({ ...filters, bedrooms: value });
  };

  const handleBathroomChange = (value) => {
    onFiltersChange({ ...filters, bathrooms: value });
  };

  const handlePropertyTypeChange = (type) => {
    const current = filters.property_types || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, property_types: updated });
  };

  const handleAmenityChange = (amenity) => {
    const current = filters.amenities || [];
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    onFiltersChange({ ...filters, amenities: updated });
  };

  const clearFilters = () => {
    onFiltersChange({
      price_range: [0, 1000000],
      bedrooms: [0, 6],
      bathrooms: [0, 6],
      property_types: [],
      amenities: [],
      location_keyword: ''
    });
  };

  const propertyTypes = ['single_family', 'condo', 'townhouse', 'multi_family', 'land'];
  const amenitiesOptions = ['Pool', 'Garage', 'Yard', 'Deck', 'Basement', 'Fireplace', 'Garden', 'Hot Tub'];

  return (
    <Card className="sticky top-6 h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {(filters.property_types?.length > 0 || filters.amenities?.length > 0 || 
            (filters.price_range && (filters.price_range[0] > 0 || filters.price_range[1] < 1000000))) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div>
          <Label className="font-medium mb-3 block">Price Range</Label>
          <Slider
            value={filters.price_range || [0, 1000000]}
            onValueChange={handlePriceChange}
            min={0}
            max={1000000}
            step={25000}
            className="mb-3"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Min"
                value={filters.price_range?.[0] || 0}
                onChange={(e) => handlePriceChange([parseInt(e.target.value) || 0, filters.price_range?.[1] || 1000000])}
                className="text-sm"
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Max"
                value={filters.price_range?.[1] || 1000000}
                onChange={(e) => handlePriceChange([filters.price_range?.[0] || 0, parseInt(e.target.value) || 1000000])}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <Label className="font-medium mb-2 block">Bedrooms</Label>
          <Slider
            value={filters.bedrooms || [0, 6]}
            onValueChange={handleBedroomChange}
            min={0}
            max={6}
            step={1}
          />
          <p className="text-xs text-slate-600 mt-2">
            {filters.bedrooms?.[0]} - {filters.bedrooms?.[1]}+
          </p>
        </div>

        {/* Bathrooms */}
        <div>
          <Label className="font-medium mb-2 block">Bathrooms</Label>
          <Slider
            value={filters.bathrooms || [0, 6]}
            onValueChange={handleBathroomChange}
            min={0}
            max={6}
            step={0.5}
          />
          <p className="text-xs text-slate-600 mt-2">
            {filters.bathrooms?.[0]} - {filters.bathrooms?.[1]}+
          </p>
        </div>

        {/* Property Type */}
        <div>
          <Label className="font-medium mb-3 block">Property Type</Label>
          <div className="space-y-2">
            {propertyTypes.map(type => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  id={type}
                  checked={(filters.property_types || []).includes(type)}
                  onCheckedChange={() => handlePropertyTypeChange(type)}
                />
                <Label htmlFor={type} className="font-normal text-sm cursor-pointer">
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <Label className="font-medium mb-3 block">Amenities</Label>
          <div className="space-y-2">
            {amenitiesOptions.map(amenity => (
              <div key={amenity} className="flex items-center gap-2">
                <Checkbox
                  id={amenity}
                  checked={(filters.amenities || []).includes(amenity)}
                  onCheckedChange={() => handleAmenityChange(amenity)}
                />
                <Label htmlFor={amenity} className="font-normal text-sm cursor-pointer">
                  {amenity}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location" className="font-medium mb-2 block">Location/School</Label>
          <Input
            id="location"
            placeholder="Neighborhood or school name"
            value={filters.location_keyword || ''}
            onChange={(e) => onFiltersChange({ ...filters, location_keyword: e.target.value })}
            className="text-sm"
          />
        </div>

        <Button
          onClick={onSearch}
          disabled={isLoading}
          className="w-full gap-2"
        >
          <Search className="w-4 h-4" />
          {isLoading ? 'Searching...' : 'Search Properties'}
        </Button>
      </CardContent>
    </Card>
  );
}