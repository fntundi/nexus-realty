import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function KeyMetrics({ metrics }) {
  if (!metrics) return null;

  const metricCards = [
    {
      title: 'Active Deals',
      value: metrics.activeTransactions,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Last 30 Days',
      value: metrics.recentTransactions,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Avg. Days to Close',
      value: metrics.avgDaysToClose || 'N/A',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Task Completion',
      value: `${metrics.taskCompletionRate}%`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{metric.title}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`w-6 h-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}