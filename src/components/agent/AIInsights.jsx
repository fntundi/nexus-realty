import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertCircle, Info } from 'lucide-react';

export default function AIInsights({ insights }) {
  if (!insights || insights.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI-Powered Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border ${getColor(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              {getIcon(insight.type)}
              <p className="text-sm flex-1">{insight.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}