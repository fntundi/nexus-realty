import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, BarChart3 } from 'lucide-react';
import NurtureWorkflowBuilder from '../components/nurture/NurtureWorkflowBuilder';
import NurtureExecutionMonitor from '../components/nurture/NurtureExecutionMonitor';

export default function NurtureWorkflowsPage() {
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showMonitor, setShowMonitor] = useState(false);

  const { data: workflows = [] } = useQuery({
    queryKey: ['nurture-workflows'],
    queryFn: () => base44.entities.NurtureWorkflow.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NurtureWorkflow.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-workflows'] });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (workflow) => {
      return await base44.entities.NurtureWorkflow.update(workflow.id, {
        ...workflow,
        is_active: !workflow.is_active
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-workflows'] });
    }
  });

  const activeWorkflows = workflows.filter(w => w.is_active);
  const inactiveWorkflows = workflows.filter(w => !w.is_active);

  const getTriggerLabel = (type, config) => {
    switch (type) {
      case 'lead_score_threshold':
        return `Score ≥ ${config?.score_threshold || 50}`;
      case 'deal_stage':
        return `Stage: ${config?.stage || 'Any'}`;
      case 'no_activity':
        return `${config?.days_inactive || 7} days inactive`;
      case 'new_lead':
        return 'New leads';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Lead Nurture Workflows</h1>
            <p className="text-slate-600 mt-1">Create and manage automated nurturing sequences</p>
          </div>
          <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Nurture Workflow</DialogTitle>
              </DialogHeader>
              <NurtureWorkflowBuilder onSuccess={() => setShowBuilder(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">Active ({activeWorkflows.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({inactiveWorkflows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeWorkflows.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  <p>No active workflows. Create one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              activeWorkflows.map(workflow => (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{workflow.name}</h3>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{workflow.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-slate-600">Trigger</p>
                            <p className="text-sm font-medium text-slate-900">
                              {getTriggerLabel(workflow.trigger_type, workflow.trigger_config)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Steps</p>
                            <p className="text-sm font-medium text-slate-900">{workflow.sequence_steps?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Triggered</p>
                            <p className="text-sm font-medium text-slate-900">
                              {workflow.engagement_metrics?.total_triggered || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Conversion</p>
                            <p className="text-sm font-medium text-green-600">
                              {workflow.engagement_metrics?.completed || 0}
                            </p>
                          </div>
                        </div>

                        {workflow.engagement_metrics?.conversion_rate !== undefined && (
                          <div className="text-xs text-slate-600">
                            📊 Open Rate: {Math.round(workflow.engagement_metrics.email_open_rate || 0)}% | 
                            Click Rate: {Math.round(workflow.engagement_metrics.email_click_rate || 0)}%
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setShowMonitor(true);
                          }}
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Monitor
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate(workflow)}
                        >
                          Pause
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this workflow?')) {
                              deleteMutation.mutate(workflow.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            {inactiveWorkflows.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  <p>No inactive workflows</p>
                </CardContent>
              </Card>
            ) : (
              inactiveWorkflows.map(workflow => (
                <Card key={workflow.id} className="opacity-75">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{workflow.name}</h3>
                          <Badge variant="outline">Inactive</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{workflow.description}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate(workflow)}
                      >
                        Activate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Execution Monitor Modal */}
        {selectedWorkflow && (
          <Dialog open={showMonitor} onOpenChange={setShowMonitor}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Workflow Monitor: {selectedWorkflow.name}</DialogTitle>
              </DialogHeader>
              <NurtureExecutionMonitor workflowId={selectedWorkflow.id} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}