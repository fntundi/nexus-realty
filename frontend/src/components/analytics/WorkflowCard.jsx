import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users } from 'lucide-react';

export default function WorkflowCard({ workflow, isSelected, onSelect }) {
  const completionRate = workflow.engagement_metrics?.completed
    ? Math.round(
        (workflow.engagement_metrics.completed /
          (workflow.engagement_metrics.total_triggered || 1)) *
          100
      )
    : 0;

  const conversionRate = workflow.engagement_metrics?.conversion_rate || 0;

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-slate-900 truncate">
            {workflow.name}
          </CardTitle>
          <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
            {workflow.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 truncate">{workflow.description}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Triggered Leads */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-600">Leads Triggered</span>
          </div>
          <span className="font-semibold text-slate-900">
            {workflow.engagement_metrics?.total_triggered || 0}
          </span>
        </div>

        {/* Completion Rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600">Completion Rate</span>
            <span className="text-sm font-semibold text-slate-900">{completionRate}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Conversion Rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-600">Conversion</span>
            </div>
            <span className="text-sm font-semibold text-green-600">{conversionRate.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full">
            <div
              className="h-full bg-green-600 rounded-full transition-all"
              style={{ width: `${Math.min(conversionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}