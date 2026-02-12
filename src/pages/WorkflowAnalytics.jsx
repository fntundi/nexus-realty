import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorkflowCard from '@/components/analytics/WorkflowCard';
import ABTestPerformanceChart from '@/components/analytics/ABTestPerformanceChart';
import WorkflowMetricsChart from '@/components/analytics/WorkflowMetricsChart';
import { BarChart, TrendingUp, Users, Target } from 'lucide-react';

export default function WorkflowAnalytics() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['nurture-workflows'],
    queryFn: () => base44.entities.NurtureWorkflow.list()
  });

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId) || workflows[0];

  if (isLoading) {
    return <div className="p-6 text-center">Loading workflows...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart className="w-8 h-8 text-blue-600" />
            Workflow Analytics
          </h1>
          <p className="text-slate-600">
            Monitor performance metrics, conversion rates, and A/B test results across your nurture workflows
          </p>
        </div>

        {/* Workflow Selector */}
        {workflows.length > 0 && (
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Select Workflow
              </label>
              <Select value={selectedWorkflowId || workflows[0]?.id} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map(workflow => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="ab-tests">A/B Tests</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {selectedWorkflow && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Leads Triggered
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900">
                        {selectedWorkflow.engagement_metrics?.total_triggered || 0}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Total leads enrolled</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Completion Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900">
                        {selectedWorkflow.engagement_metrics?.completed
                          ? Math.round(
                              (selectedWorkflow.engagement_metrics.completed /
                                selectedWorkflow.engagement_metrics.total_triggered) *
                                100
                            )
                          : 0}
                        %
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedWorkflow.engagement_metrics?.completed || 0} completed
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Conversion Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900">
                        {selectedWorkflow.engagement_metrics?.conversion_rate
                          ? selectedWorkflow.engagement_metrics.conversion_rate.toFixed(1)
                          : 0}
                        %
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Leads converted to deals</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">Avg Time to Conversion</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900">
                        {selectedWorkflow.engagement_metrics?.avg_time_to_conversion
                          ? Math.round(selectedWorkflow.engagement_metrics.avg_time_to_conversion)
                          : 0}{' '}
                        days
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Average conversion timeline</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Email Engagement Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Email Engagement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Open Rate</p>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedWorkflow.engagement_metrics?.email_open_rate
                            ? selectedWorkflow.engagement_metrics.email_open_rate.toFixed(1)
                            : 0}
                          %
                        </div>
                        <div className="h-2 bg-slate-200 rounded mt-2">
                          <div
                            className="h-full bg-blue-600 rounded"
                            style={{
                              width: `${Math.min(
                                selectedWorkflow.engagement_metrics?.email_open_rate || 0,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-slate-600 mb-1">Click Rate</p>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedWorkflow.engagement_metrics?.email_click_rate
                            ? selectedWorkflow.engagement_metrics.email_click_rate.toFixed(1)
                            : 0}
                          %
                        </div>
                        <div className="h-2 bg-slate-200 rounded mt-2">
                          <div
                            className="h-full bg-green-600 rounded"
                            style={{
                              width: `${Math.min(
                                selectedWorkflow.engagement_metrics?.email_click_rate || 0,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-slate-600 mb-1">Workflow Active</p>
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedWorkflow.is_active ? 'Yes' : 'No'}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Created: {new Date(selectedWorkflow.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* All Workflows */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">All Workflows</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map(workflow => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    isSelected={selectedWorkflowId === workflow.id}
                    onSelect={() => setSelectedWorkflowId(workflow.id)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            {selectedWorkflow && <WorkflowMetricsChart workflow={selectedWorkflow} />}
          </TabsContent>

          {/* A/B Tests Tab */}
          <TabsContent value="ab-tests">
            {selectedWorkflow && <ABTestPerformanceChart workflow={selectedWorkflow} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}