import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function WorkflowMetricsChart({ workflow }) {
  // Calculate execution status distribution
  const statusData = useMemo(() => {
    if (!workflow.execution_history || workflow.execution_history.length === 0) {
      return [
        { name: 'In Progress', value: 0, color: '#3b82f6' },
        { name: 'Completed', value: 0, color: '#10b981' },
        { name: 'Paused', value: 0, color: '#f59e0b' },
        { name: 'Failed', value: 0, color: '#ef4444' }
      ];
    }

    const statuses = {
      in_progress: 0,
      completed: 0,
      paused: 0,
      failed: 0
    };

    workflow.execution_history.forEach(execution => {
      statuses[execution.status] = (statuses[execution.status] || 0) + 1;
    });

    return [
      { name: 'In Progress', value: statuses.in_progress, color: '#3b82f6' },
      { name: 'Completed', value: statuses.completed, color: '#10b981' },
      { name: 'Paused', value: statuses.paused, color: '#f59e0b' },
      { name: 'Failed', value: statuses.failed, color: '#ef4444' }
    ];
  }, [workflow.execution_history]);

  // Calculate engagement metrics over time
  const engagementData = useMemo(() => {
    return [
      {
        name: 'Overall',
        opens: workflow.engagement_metrics?.email_open_rate || 0,
        clicks: workflow.engagement_metrics?.email_click_rate || 0,
        conversions: workflow.engagement_metrics?.conversion_rate || 0
      }
    ];
  }, [workflow.engagement_metrics]);

  // Calculate time to conversion distribution
  const timeToConversionData = useMemo(() => {
    if (!workflow.execution_history || workflow.execution_history.length === 0) {
      return [];
    }

    const completed = workflow.execution_history.filter(e => e.status === 'completed');
    if (completed.length === 0) return [];

    // Group by days to conversion
    const days = [1, 7, 14, 30, 60, 90];
    return days.map(day => {
      const count = completed.filter(e => {
        const startDate = new Date(e.started_date);
        const endDate = new Date(e.completion_date);
        const daysElapsed = (endDate - startDate) / (1000 * 60 * 60 * 24);
        return daysElapsed <= day;
      }).length;
      return { name: `${day}d`, count };
    });
  }, [workflow.execution_history]);

  // Calculate completion rate by sequence step
  const stepPerformanceData = useMemo(() => {
    if (!workflow.sequence_steps || workflow.sequence_steps.length === 0) {
      return [];
    }

    return workflow.sequence_steps.map((step, index) => {
      const executionsReachingStep = workflow.execution_history?.filter(e => {
        const pathLength = e.branch_path?.length || 0;
        return pathLength > index;
      }).length || 0;

      const completionRate =
        workflow.execution_history && workflow.execution_history.length > 0
          ? (executionsReachingStep / workflow.execution_history.length) * 100
          : 0;

      return {
        name: `Step ${index + 1}`,
        completion: completionRate,
        executions: executionsReachingStep
      };
    });
  }, [workflow.sequence_steps, workflow.execution_history]);

  return (
    <div className="space-y-6">
      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Email Engagement Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="opens" fill="#3b82f6" name="Open Rate %" />
                <Bar dataKey="clicks" fill="#10b981" name="Click Rate %" />
                <Bar dataKey="conversions" fill="#f59e0b" name="Conversion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Step Performance */}
      {stepPerformanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate by Step</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stepPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="completion" fill="#3b82f6" name="Completion Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time to Conversion */}
      {timeToConversionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Conversions by Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeToConversionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Conversions', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    name="Conversions"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}