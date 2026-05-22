import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

export default function LeadScoreDisplay({ leadScore, scoreBreakdown }) {
  const getScoreColor = (score) => {
    if (score >= 75) return 'from-green-100 to-green-50';
    if (score >= 50) return 'from-blue-100 to-blue-50';
    if (score >= 25) return 'from-yellow-100 to-yellow-50';
    return 'from-slate-100 to-slate-50';
  };

  const getScoreLabel = (score) => {
    if (score >= 75) return 'Hot Lead';
    if (score >= 50) return 'Warm Lead';
    if (score >= 25) return 'Lukewarm Lead';
    return 'Cold Lead';
  };

  const getScoreBadgeVariant = (score) => {
    if (score >= 75) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-blue-100 text-blue-800';
    if (score >= 25) return 'bg-yellow-100 text-yellow-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <Card className={`bg-gradient-to-br ${getScoreColor(leadScore)} border-none`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-slate-600 mb-1">Lead Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{leadScore}</span>
              <span className="text-lg text-slate-600">/100</span>
            </div>
          </div>
          <Badge className={getScoreBadgeVariant(leadScore)} variant="default">
            <TrendingUp className="w-3 h-3 mr-1" />
            {getScoreLabel(leadScore)}
          </Badge>
        </div>

        {scoreBreakdown && (
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Interactions</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${Math.min(scoreBreakdown.interaction_score || 0, 40) / 40 * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 w-8 text-right">
                  {scoreBreakdown.interaction_score || 0}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Demographics</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full" 
                    style={{ width: `${Math.min(scoreBreakdown.demographic_score || 0, 30) / 30 * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 w-8 text-right">
                  {scoreBreakdown.demographic_score || 0}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Engagement</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full" 
                    style={{ width: `${Math.min(scoreBreakdown.engagement_score || 0, 30) / 30 * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 w-8 text-right">
                  {scoreBreakdown.engagement_score || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}