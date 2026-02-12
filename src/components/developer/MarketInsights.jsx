import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Home, DollarSign } from 'lucide-react';

export default function MarketInsights({ project }) {
  const insights = [
    {
      icon: <Users className="w-5 h-5 text-blue-500" />,
      label: 'Target Market',
      value: 'Young professionals & growing families',
      color: 'bg-blue-50'
    },
    {
      icon: <Home className="w-5 h-5 text-green-500" />,
      label: 'Market Demand',
      value: 'High — Strong buyer interest in this area',
      color: 'bg-green-50'
    },
    {
      icon: <DollarSign className="w-5 h-5 text-orange-500" />,
      label: 'Average Price Appreciation',
      value: '4-6% annually in this market',
      color: 'bg-orange-50'
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-purple-500" />,
      label: 'Development Trend',
      value: 'Mixed-use developments gaining momentum',
      color: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, idx) => (
          <Card key={idx} className={insight.color}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{insight.icon}</div>
                <div className="flex-1">
                  <p className="text-sm text-slate-600 font-medium">{insight.label}</p>
                  <p className="text-slate-900 font-semibold mt-1">{insight.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Development Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            This {project.type?.replace(/_/g, ' ')} project capitalizes on strong demand in the {project.location} market. 
            The combination of location, amenities, and pricing positions it competitively against comparable developments.
          </p>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Key Competitive Advantages:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Strategic location with proximity to schools and employment centers</li>
              <li>Premium amenities and modern design appeal to target demographics</li>
              <li>Phased development allows flexible pricing and marketing strategies</li>
              <li>Community-focused design supports long-term appreciation</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}