import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, X, School, Home, TreePine } from 'lucide-react';

export default function AdvancedPropertyFilters({ filters, onFiltersChange, onSearch, isLoading }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePriceChange = (value) => {
    onFiltersChange({ ...filters, price_range: value });
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

  const propertyTypes = [
    { value: 'single_family', label: 'Single Family' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'multi_family', label: 'Multi-Family' },
    { value: 'land', label: 'Land' }
  ];

  const amenitiesOptions = [
    'Pool', 'Garage', 'Yard', 'Deck', 'Basement', 'Fireplace', 
    'Garden', 'Hot Tub', 'Gym', 'Tennis Court', 'Gated Community',
    'Pet Friendly', 'Laundry', 'AC', 'Hardwood Floors'
  ];

  const schoolDistricts = [
    'Austin ISD', 'Round Rock ISD', 'Leander ISD', 'Eanes ISD',
    'Lake Travis ISD', 'Pflugerville ISD', 'Del Valle ISD'
  ];

  const clearFilters = () => {
    onFiltersChange({
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

  const hasActiveFilters = 
    filters.property_types?.length > 0 || 
    filters.amenities?.length > 0 ||
    filters.school_district ||
    (filters.price_range && (filters.price_range[0] > 0 || filters.price_range[1] < 2000000));

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="w-5 h-5" />
            Advanced Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="w-3 h-3 mr-1" /> Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Range */}
        <div>
          <Label className="font-medium mb-3 block">Price Range</Label>
          <Slider
            value={filters.price_range || [0, 2000000]}
            onValueChange={handlePriceChange}
            min={0}
            max={2000000}
            step={50000}
            className="mb-3"
          />
          <div className="flex gap-2 text-sm">
            <div className="flex-1 p-2 bg-slate-50 rounded text-center">
              ${(filters.price_range?.[0] || 0).toLocaleString()}
            </div>
            <div className="flex-1 p-2 bg-slate-50 rounded text-center">
              ${(filters.price_range?.[1] || 2000000).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Beds & Baths */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm mb-2 block">Beds</Label>
            <Select
              value={filters.bedrooms?.[0]?.toString() || '0'}
              onValueChange={(val) => onFiltersChange({ 
                ...filters, 
                bedrooms: [parseInt(val), filters.bedrooms?.[1] || 6] 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n}+</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm mb-2 block">Baths</Label>
            <Select
              value={filters.bathrooms?.[0]?.toString() || '0'}
              onValueChange={(val) => onFiltersChange({ 
                ...filters, 
                bathrooms: [parseInt(val), filters.bathrooms?.[1] || 6] 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n}+</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Property Type */}
        <div>
          <Label className="font-medium mb-3 block">Property Type</Label>
          <div className="flex flex-wrap gap-2">
            {propertyTypes.map(type => (
              <Badge
                key={type.value}
                variant={(filters.property_types || []).includes(type.value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handlePropertyTypeChange(type.value)}
              >
                {type.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* School District */}
        <div>
          <Label className="font-medium mb-2 block flex items-center gap-2">
            <School className="w-4 h-4" />
            School District
          </Label>
          <Select
            value={filters.school_district || ''}
            onValueChange={(val) => onFiltersChange({ ...filters, school_district: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any district" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Any district</SelectItem>
              {schoolDistricts.map(district => (
                <SelectItem key={district} value={district}>{district}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Section Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <TreePine className="w-4 h-4" />
            More Filters
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t">
            {/* Square Footage */}
            <div>
              <Label className="text-sm mb-2 block">Square Footage</Label>
              <Slider
                value={filters.square_feet || [0, 5000]}
                onValueChange={(val) => onFiltersChange({ ...filters, square_feet: val })}
                min={0}
                max={5000}
                step={100}
                className="mb-2"
              />
              <div className="flex gap-2 text-xs text-slate-600">
                <span>{(filters.square_feet?.[0] || 0).toLocaleString()} sqft</span>
                <span>-</span>
                <span>{(filters.square_feet?.[1] || 5000).toLocaleString()} sqft</span>
              </div>
            </div>

            {/* Lot Size */}
            <div>
              <Label className="text-sm mb-2 block">Min Lot Size (acres)</Label>
              <Input
                type="number"
                placeholder="0.25"
                step="0.25"
                value={filters.lot_size_min || ''}
                onChange={(e) => onFiltersChange({ ...filters, lot_size_min: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Year Built */}
            <div>
              <Label className="text-sm mb-2 block">Built After</Label>
              <Input
                type="number"
                placeholder="2000"
                value={filters.year_built_min || ''}
                onChange={(e) => onFiltersChange({ ...filters, year_built_min: parseInt(e.target.value) || 1900 })}
              />
            </div>

            {/* HOA Fees */}
            <div>
              <Label className="text-sm mb-2 block">Max HOA (monthly)</Label>
              <Input
                type="number"
                placeholder="500"
                value={filters.hoa_max || ''}
                onChange={(e) => onFiltersChange({ ...filters, hoa_max: parseInt(e.target.value) || 1000 })}
              />
            </div>

            {/* Parking */}
            <div>
              <Label className="text-sm mb-2 block">Min Parking Spaces</Label>
              <Select
                value={filters.parking_spaces?.toString() || '0'}
                onValueChange={(val) => onFiltersChange({ ...filters, parking_spaces: parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}+ spaces</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amenities */}
            <div>
              <Label className="text-sm mb-3 block">Amenities</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {amenitiesOptions.map(amenity => (
                  <Badge
                    key={amenity}
                    variant={(filters.amenities || []).includes(amenity) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => handleAmenityChange(amenity)}
                  >
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}