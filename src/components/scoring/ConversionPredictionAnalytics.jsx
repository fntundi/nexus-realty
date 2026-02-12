import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle } from 'lucide-react';

export default function ConversionPredictionAnalytics({ analytics, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          Analyzing conversion patterns...
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  const { lead_analysis, conversion_by_score_range, model_effectiveness } = analytics;

  const getConversionLevelColor = (rate) => {
    if (rate >= 60) return 'text-green-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPercentileBadge = (percentile) => {
    if (percentile >= 75) return { label: 'Top Tier', variant: 'default' };
    if (percentile >= 50) return { label: 'Above Average', variant: 'secondary' };
    return { label: 'Developing', variant: 'outline' };
  };

  const badgeInfo = getPercentileBadge(lead_analysis?.percentile || 0);

  return (
    <div className="space-y-4">
      {/* Lead Score Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Lead Conversion Prediction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Current Score</p>
              <p className="text-2xl font-bold text-slate-900">
                {lead_analysis?.score || 'N/A'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Percentile</p>
              <p className="text-2xl font-bold text-blue-600">
                {lead_analysis?.percentile || 0}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Expected Conversion</p>
              <p className={`text-2xl font-bold ${getConversionLevelColor(lead_analysis?.range_conversion_rate || 0)}`}>
                {Math.round(lead_analysis?.range_conversion_rate || 0)}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Similar Leads</p>
              <p className="text-2xl font-bold text-slate-900">
                {lead_analysis?.similar_leads || 0}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <Badge variant={badgeInfo.variant} className="text-sm">
              {badgeInfo.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rate by Score Range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversion Rate by Score Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversion_by_score_range}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="score_range" />
                <YAxis label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="conversion_rate" fill="#10b981" name="Conversion Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Model Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Model Effectiveness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-slate-600 mb-2">High Score Conversion</p>
              <p className="text-3xl font-bold text-green-600">
                {Math.round(model_effectiveness?.high_score_conversion || 0)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Leads scoring 75-100</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 mb-2">Discrimination Index</p>
              <p className="text-3xl font-bold text-slate-900">
                {Math.round(model_effectiveness?.discrimination_index || 0)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">High vs Low score gap</p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs text-slate-600 mb-2">Low Score Conversion</p>
              <p className="text-3xl font-bold text-orange-600">
                {Math.round(model_effectiveness?.low_score_conversion || 0)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Leads scoring 0-25</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-slate-600">
              {model_effectiveness?.discrimination_index > 20
                ? "✓ Your model effectively differentiates between high and low-quality leads."
                : "⚠ Consider refining factors to better distinguish conversion likelihood."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}