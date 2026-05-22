import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Home, DollarSign, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MarketDataWidget({ propertyId, address, zipCode }) {
  const { data: config } = useQuery({
    queryKey: ['market-data-config'],
    queryFn: async () => {
      const configs = await base44.entities.MarketDataConfig.filter({ is_enabled: true });
      return configs[0] || null;
    }
  });

  const { data: marketData, isLoading, error } = useQuery({
    queryKey: ['market-data', propertyId, address],
    queryFn: async () => {
      const result = await base44.functions.invoke('fetchMarketData', {
        property_id: propertyId,
        address: address,
        zip_code: zipCode
      });
      return result.data;
    },
    enabled: !!config?.is_enabled && (!!propertyId || !!address),
    retry: false
  });

  if (!config?.is_enabled) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Market Data Not Enabled</p>
              <p className="text-sm text-amber-700 mt-1">
                Contact your administrator to configure market data integration for property insights.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Unable to Load Market Data</p>
              <p className="text-sm text-red-700 mt-1">
                {error.message || 'Please try again later'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketData?.data) return null;

  const data = marketData.data;

  return (
    <div className="space-y-4">
      {/* Property Estimate */}
      {data.estimated_value > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Estimated Value
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {data.provider}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              ${data.estimated_value.toLocaleString()}
            </div>
            {data.value_range_low > 0 && data.value_range_high > 0 && (
              <div className="text-sm text-slate-600 mt-2">
                Range: ${data.value_range_low.toLocaleString()} - ${data.value_range_high.toLocaleString()}
              </div>
            )}
            {data.price_per_sqft > 0 && (
              <div className="text-sm text-slate-600 mt-1">
                ${data.price_per_sqft}/sqft
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Market Trends */}
      {data.market_trends && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Market Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {data.market_trends.median_price > 0 && (
                <div>
                  <div className="text-xs text-slate-600">Median Price</div>
                  <div className="font-semibold">${data.market_trends.median_price.toLocaleString()}</div>
                </div>
              )}
              {data.market_trends.days_on_market_avg > 0 && (
                <div>
                  <div className="text-xs text-slate-600">Avg Days on Market</div>
                  <div className="font-semibold">{data.market_trends.days_on_market_avg} days</div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {data.market_trends.price_change_30d !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">30-Day Change</span>
                  <div className={`flex items-center gap-1 ${
                    data.market_trends.price_change_30d >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.market_trends.price_change_30d >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="font-semibold">{Math.abs(data.market_trends.price_change_30d)}%</span>
                  </div>
                </div>
              )}
              {data.market_trends.price_change_12m !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">12-Month Change</span>
                  <div className={`flex items-center gap-1 ${
                    data.market_trends.price_change_12m >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.market_trends.price_change_12m >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="font-semibold">{Math.abs(data.market_trends.price_change_12m)}%</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Neighborhood Stats */}
      {data.neighborhood_stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Neighborhood Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {data.neighborhood_stats.median_home_value > 0 && (
                <div>
                  <div className="text-slate-600">Median Home Value</div>
                  <div className="font-semibold">${data.neighborhood_stats.median_home_value.toLocaleString()}</div>
                </div>
              )}
              {data.neighborhood_stats.median_rent > 0 && (
                <div>
                  <div className="text-slate-600">Median Rent</div>
                  <div className="font-semibold">${data.neighborhood_stats.median_rent.toLocaleString()}/mo</div>
                </div>
              )}
              {data.neighborhood_stats.walkability_score > 0 && (
                <div>
                  <div className="text-slate-600">Walk Score</div>
                  <div className="font-semibold">{data.neighborhood_stats.walkability_score}/100</div>
                </div>
              )}
              {data.neighborhood_stats.school_rating_avg > 0 && (
                <div>
                  <div className="text-slate-600">School Rating</div>
                  <div className="font-semibold">{data.neighborhood_stats.school_rating_avg}/10</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparable Sales */}
      {data.comparable_sales?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4" />
              Recent Comparable Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.comparable_sales.slice(0, 3).map((comp, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="text-sm font-medium">{comp.address}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-slate-600">
                      {comp.bedrooms}bd • {comp.bathrooms}ba • {comp.square_feet?.toLocaleString()} sqft
                    </span>
                    <span className="font-semibold text-sm">${comp.sold_price.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-slate-500 text-center">
        Data updated: {new Date(data.fetched_date).toLocaleDateString()}
      </p>
    </div>
  );
}