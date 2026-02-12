import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function ABTestPerformanceChart({ workflow }) {
  // Extract A/B test data from sequence steps
  const abTestData = useMemo(() => {
    if (!workflow.sequence_steps) return [];

    const tests = [];
    workflow.sequence_steps.forEach((step) => {
      if (step.ab_test?.enabled && step.ab_test?.variants) {
        tests.push({
          stepId: step.step_id,
          stepName: `Step ${workflow.sequence_steps.indexOf(step) + 1}`,
          variants: step.ab_test.variants,
          winningMetric: step.ab_test.winning_metric,
          winner: step.ab_test.winner
        });
      }
    });
    return tests;
  }, [workflow.sequence_steps]);

  // Prepare variant comparison data for each A/B test
  const variantComparisonData = useMemo(() => {
    return abTestData.map(test => ({
      stepName: test.stepName,
      variants: test.variants.map(v => ({
        variant: v.variant_id,
        sent: v.sent_count || 0,
        opens: v.open_count || 0,
        clicks: v.click_count || 0,
        conversions: v.conversion_count || 0,
        openRate: v.sent_count ? ((v.open_count / v.sent_count) * 100).toFixed(1) : 0,
        clickRate: v.sent_count ? ((v.click_count / v.sent_count) * 100).toFixed(1) : 0,
        conversionRate: v.sent_count ? ((v.conversion_count / v.sent_count) * 100).toFixed(1) : 0,
        isWinner: v.variant_id === test.winner
      }))
    }));
  }, [abTestData]);

  // Prepare performance metrics comparison
  const metricsComparison = useMemo(() => {
    if (variantComparisonData.length === 0) return [];

    return variantComparisonData.flatMap(test =>
      test.variants.map(variant => ({
        testName: test.stepName,
        variant: `${test.stepName} - ${variant.variant}`,
        openRate: parseFloat(variant.openRate),
        clickRate: parseFloat(variant.clickRate),
        conversionRate: parseFloat(variant.conversionRate)
      }))
    );
  }, [variantComparisonData]);

  if (abTestData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-slate-500 py-8">
            No A/B tests configured in this workflow
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* A/B Test Summary Cards */}
      {variantComparisonData.map((test, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {test.stepName}
              {test.variants.find(v => v.isWinner) && (
                <Badge className="bg-green-600">Winner Declared</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {test.variants.map((variant, vIdx) => (
                <div
                  key={vIdx}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    variant.isWinner
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">Variant {variant.variant}</h4>
                    {variant.isWinner && (
                      <Badge className="bg-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Winner
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sent:</span>
                      <span className="font-semibold text-slate-900">{variant.sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Opens:</span>
                      <span className="font-semibold text-slate-900">
                        {variant.opens} ({variant.openRate}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Clicks:</span>
                      <span className="font-semibold text-slate-900">
                        {variant.clicks} ({variant.clickRate}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Conversions:</span>
                      <span className="font-semibold text-slate-900">
                        {variant.conversions} ({variant.conversionRate}%)
                      </span>
                    </div>
                  </div>

                  {/* Performance bars */}
                  <div className="mt-4 space-y-2">
                    <div>
                      <div className="text-xs text-slate-600 mb-1">Open Rate</div>
                      <div className="h-2 bg-slate-200 rounded">
                        <div
                          className="h-full bg-blue-600 rounded"
                          style={{ width: `${Math.min(parseFloat(variant.openRate), 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-1">Click Rate</div>
                      <div className="h-2 bg-slate-200 rounded">
                        <div
                          className="h-full bg-green-600 rounded"
                          style={{ width: `${Math.min(parseFloat(variant.clickRate), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Comparison Chart */}
      {metricsComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>A/B Test Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricsComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="variant" angle={-45} textAnchor="end" height={100} />
                  <YAxis label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="openRate" fill="#3b82f6" name="Open Rate %" />
                  <Bar dataKey="clickRate" fill="#10b981" name="Click Rate %" />
                  <Bar dataKey="conversionRate" fill="#f59e0b" name="Conversion Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}