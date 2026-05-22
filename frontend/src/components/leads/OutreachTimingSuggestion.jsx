import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, TrendingUp, Loader2 } from 'lucide-react';

export default function OutreachTimingSuggestion({ leadId, contactEmail }) {
  const [showDetails, setShowDetails] = useState(false);

  const { data: timing, isLoading, error } = useQuery({
    queryKey: ['outreach-timing', leadId],
    queryFn: async () => {
      const response = await base44.functions.invoke('suggestOutreachTiming', {
        leadId,
        contactEmail
      });
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-slate-600">Analyzing interaction patterns...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !timing) {
    return null;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          AI-Optimized Outreach Timing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-semibold">BEST DAYS</p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {timing.bestDays?.slice(0, 2).join(', ')}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-semibold">BEST HOURS</p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {timing.bestHours?.slice(0, 3).map(h => `${h}:00`).join(', ')}
            </p>
          </div>
        </div>

        {/* Next Suggested Time */}
        {timing.nextSuggestedTime && (
          <div className="p-3 bg-orange-50 border-l-4 border-orange-600 rounded">
            <p className="text-xs text-orange-600 font-semibold">NEXT SUGGESTED OUTREACH</p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {new Date(timing.nextSuggestedTime).toLocaleString()}
            </p>
          </div>
        )}

        {/* Details Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>

        {/* Detailed Analysis */}
        {showDetails && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-2">All Best Days</p>
              <div className="flex flex-wrap gap-2">
                {timing.bestDays?.map(day => (
                  <Badge key={day} variant="outline" className="bg-blue-50">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900 mb-2">Best Hours ({timing.timezone})</p>
              <div className="flex flex-wrap gap-2">
                {timing.bestHours?.map(hour => (
                  <Badge key={hour} variant="outline">
                    {hour}:00
                  </Badge>
                ))}
              </div>
            </div>

            {timing.frequency && (
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Recommended Frequency</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                  {timing.frequency}
                </p>
              </div>
            )}

            {timing.reasoning && (
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">AI Analysis</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded leading-relaxed">
                  {timing.reasoning}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}