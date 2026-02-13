import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Home, DollarSign } from 'lucide-react';
import MarketDataWidget from '../market/MarketDataWidget';

export default function PersonalizedMarketInsights({ transaction, favoriteProperties }) {
  // Get market data for active transaction property
  const transactionProperty = transaction?.property_id;

  // Get market stats for favorite properties areas
  const favoriteZipCodes = [...new Set(favoriteProperties?.map(p => p.zip_code).filter(Boolean))];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Market Insights for You
      </h3>

      {/* Active Transaction Insights */}
      {transactionProperty && (
        <div>
          <p className="text-sm text-slate-600 mb-3">Your Active Transaction</p>
          <MarketDataWidget propertyId={transactionProperty} />
        </div>
      )}

      {/* Favorite Properties Area Insights */}
      {!transactionProperty && favoriteProperties?.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-3">Areas You're Interested In</p>
          <MarketDataWidget 
            address={favoriteProperties[0].address}
            zipCode={favoriteProperties[0].zip_code}
          />
        </div>
      )}

      {/* Quick Market Stats */}
      {!transactionProperty && favoriteProperties?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Save properties to see personalized market insights</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}