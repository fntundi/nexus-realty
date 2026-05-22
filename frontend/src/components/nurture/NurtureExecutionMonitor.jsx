import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

export default function NurtureExecutionMonitor({ workflowId }) {
  const queryClient = useQueryClient();
  const [selectedExecution, setSelectedExecution] = useState(null);

  const { data: workflow } = useQuery({
    queryKey: ['nurture-workflow', workflowId],
    queryFn: () => base44.entities.NurtureWorkflow.get(workflowId)
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['available-leads'],
    queryFn: () => base44.entities.Lead.list()
  });

  const executeMutation = useMutation({
    mutationFn: async (leadId) => {
      return await base44.functions.invoke('executeNurtureWorkflow', {
        workflowId,
        leadId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-workflow', workflowId] });
    }
  });

  if (!workflow) return null;

  const metrics = workflow.engagement_metrics || {};
  const conversions = metrics.completed || 0;
  const triggered = metrics.total_triggered || 0;
  const conversionRate = triggered > 0 ? Math.round((conversions / triggered) * 100) : 0;

  const executionHistory = workflow.execution_history || [];
  const chartData = executionHistory.slice(-10).map((ex, idx) => ({
    step: idx + 1,
    completed: ex.status === 'completed' ? 1 : 0,
    inProgress: ex.status === 'in_progress' ? 1 : 0,
    failed: ex.status === 'failed' ? 1 : 0
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">{triggered}</div>
              <p className="text-xs text-slate-600 mt-1">Triggered</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{conversions}</div>
              <p className="text-xs text-slate-600 mt-1">Conversions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{conversionRate}%</div>
              <p className="text-xs text-slate-600 mt-1">Conversion Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{Math.round(metrics.email_open_rate || 0)}%</div>
              <p className="text-xs text-slate-600 mt-1">Email Open Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution History</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="inProgress" fill="#3b82f6" name="In Progress" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Available Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trigger Workflow for Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {leads.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-4">No leads available</p>
            ) : (
              leads.map(lead => {
                const isTriggered = executionHistory.some(ex => ex.lead_id === lead.id);
                return (
                  <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{lead.contact_email}</p>
                      <p className="text-xs text-slate-600">Score: {lead.lead_score || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isTriggered && (
                        <Badge variant="outline" className="bg-green-50">✓ Triggered</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeMutation.mutate(lead.id)}
                        disabled={executeMutation.isPending}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Execution Details */}
      {executionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {executionHistory.slice().reverse().map((exec, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded border-l-4 border-blue-600">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{exec.lead_id}</p>
                      <p className="text-xs text-slate-600">
                        {new Date(exec.started_date).toLocaleDateString()} • Step {exec.current_step}/{workflow.sequence_steps.length}
                      </p>
                    </div>
                    <Badge className={
                      exec.status === 'completed' ? 'bg-green-100 text-green-800' :
                      exec.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {exec.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}