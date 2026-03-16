import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Zap, ArrowRight, ListChecks, Settings, TestTube2 } from 'lucide-react';
import { toast } from 'sonner';
import StageWorkflowRuleForm from '@/components/workflows/StageWorkflowRuleForm';
import WorkflowRuleCard from '@/components/workflows/WorkflowRuleCard';

const STAGE_LABELS = {
  pre_qual: 'Pre-Qualification',
  showing: 'Showing',
  offer: 'Offer',
  under_contract: 'Under Contract',
  closing: 'Closing',
  closed: 'Closed',
};

const DEFAULT_RULES = [
  {
    name: 'Under Contract → Closing Checklist',
    description: 'Generates a closing checklist for the agent and notifies the buyer when moving to closing',
    from_stage: 'under_contract',
    to_stage: 'closing',
    is_active: true,
    actions: [
      {
        action_type: 'generate_checklist',
        title: 'Final Closing Checklist — {{property_address}}',
        description: 'Complete all closing tasks:\n1. Order title search\n2. Schedule final walkthrough\n3. Confirm loan funding date\n4. Verify wire transfer instructions\n5. Collect all required signatures\n6. Coordinate with escrow company',
        assign_to_role: 'agent',
        priority: 'high',
        due_days_offset: 1
      },
      {
        action_type: 'send_notification',
        title: 'Your Transaction is Moving to Closing!',
        description: 'Great news! Your purchase of {{property_address}} is now in the closing stage. Your agent will be in touch with next steps and the closing timeline.',
        notify_roles: ['buyer'],
        priority: 'high'
      },
      {
        action_type: 'send_notification',
        title: 'Loan Docs Needed — Closing Stage',
        description: 'Transaction for {{property_address}} has entered closing. Please prepare and submit final loan documents by the closing date.',
        notify_roles: ['lender'],
        priority: 'high'
      }
    ]
  },
  {
    name: 'Offer Accepted → Under Contract Tasks',
    description: 'Creates inspection and appraisal tasks when a deal goes under contract',
    from_stage: 'offer',
    to_stage: 'under_contract',
    is_active: true,
    actions: [
      {
        action_type: 'create_task',
        title: 'Schedule Home Inspection — {{property_address}}',
        description: 'Order and schedule a professional home inspection within 10 days per contract terms.',
        assign_to_role: 'agent',
        priority: 'critical',
        due_days_offset: 7
      },
      {
        action_type: 'create_task',
        title: 'Order Appraisal — {{property_address}}',
        description: 'Submit appraisal order to lender for {{property_address}}. Contract price: {{contract_price}}.',
        assign_to_role: 'lender',
        priority: 'high',
        due_days_offset: 5
      },
      {
        action_type: 'send_email',
        title: 'Congratulations — Your Offer Was Accepted!',
        description: 'Dear buyer,\n\nWonderful news — your offer on {{property_address}} has been accepted and your transaction is now under contract!\n\nNext steps:\n• Home inspection will be scheduled shortly\n• Lender will order an appraisal\n• Your agent will keep you updated on all milestones\n\nExpected closing date: {{closing_date}}\n\nCongratulations!',
        notify_roles: ['buyer'],
        priority: 'medium'
      }
    ]
  },
  {
    name: 'Pre-Qual → Showing Tasks',
    description: 'Prepares agent with showing prep tasks when a lead enters the showing stage',
    from_stage: 'pre_qual',
    to_stage: 'showing',
    is_active: true,
    actions: [
      {
        action_type: 'create_task',
        title: 'Prepare Showing Package for {{property_address}}',
        description: 'Gather property disclosures, comparables, and neighborhood info for the showing.',
        assign_to_role: 'agent',
        priority: 'medium',
        due_days_offset: 1
      }
    ]
  }
];

export default function StageWorkflowEngine() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [testTransactionId, setTestTransactionId] = useState('');
  const [testFromStage, setTestFromStage] = useState('under_contract');
  const [testToStage, setTestToStage] = useState('closing');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['stage-workflow-rules'],
    queryFn: () => base44.entities.StageWorkflowRule.list('-created_date')
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions-all'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 20)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StageWorkflowRule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stage-workflow-rules'] }); toast.success('Workflow rule created'); setDialogOpen(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StageWorkflowRule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stage-workflow-rules'] }); toast.success('Rule updated'); setDialogOpen(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StageWorkflowRule.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stage-workflow-rules'] }); toast.success('Rule deleted'); }
  });

  const handleSave = (formData) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleOpenCreate = () => { setEditingRule(null); setDialogOpen(true); };
  const handleEdit = (rule) => { setEditingRule(rule); setDialogOpen(true); };
  const handleToggle = (rule) => updateMutation.mutate({ id: rule.id, data: { ...rule, is_active: !rule.is_active } });

  const handleSeedDefaults = async () => {
    for (const rule of DEFAULT_RULES) {
      await base44.entities.StageWorkflowRule.create(rule);
    }
    queryClient.invalidateQueries({ queryKey: ['stage-workflow-rules'] });
    toast.success(`Created ${DEFAULT_RULES.length} default workflow rules`);
  };

  const handleTest = async () => {
    if (!testTransactionId) { toast.error('Select a transaction to test'); return; }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await base44.functions.invoke('stageTransitionWorkflow', {
        transaction_id: testTransactionId,
        from_stage: testFromStage,
        to_stage: testToStage
      });
      setTestResult(result.data);
      toast.success(`Workflow executed: ${result.data?.actions_performed || 0} actions performed`);
    } catch (err) {
      toast.error('Test failed: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Group rules by to_stage
  const rulesByStage = Object.keys(STAGE_LABELS).reduce((acc, stage) => {
    acc[stage] = rules.filter(r => r.to_stage === stage);
    return acc;
  }, {});

  const activeCount = rules.filter(r => r.is_active).length;
  const totalActions = rules.reduce((sum, r) => sum + (r.actions?.length || 0), 0);
  const totalExecutions = rules.reduce((sum, r) => sum + (r.execution_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-8 h-8 text-amber-500" />
              Stage Workflow Engine
            </h1>
            <p className="text-slate-600 mt-1">Automate tasks, notifications, and emails when transactions change stages</p>
          </div>
          <div className="flex gap-2">
            {rules.length === 0 && (
              <Button variant="outline" onClick={handleSeedDefaults}>
                <ListChecks className="w-4 h-4 mr-2" />
                Load Defaults
              </Button>
            )}
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Rule
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
              <div className="text-sm text-slate-500">Active Rules</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-slate-900">{totalActions}</div>
              <div className="text-sm text-slate-500">Total Actions Configured</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-amber-600">{totalExecutions}</div>
              <div className="text-sm text-slate-500">Total Executions</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">
              <Settings className="w-4 h-4 mr-2" />
              Rules ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="test">
              <TestTube2 className="w-4 h-4 mr-2" />
              Test Engine
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-6 space-y-8">
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">Loading rules...</div>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center space-y-4">
                  <Zap className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-slate-500">No workflow rules yet.</p>
                  <p className="text-sm text-slate-400">Click <strong>Load Defaults</strong> to get started with pre-built rules, or create your own.</p>
                  <Button variant="outline" onClick={handleSeedDefaults}>
                    <ListChecks className="w-4 h-4 mr-2" />
                    Load Default Rules
                  </Button>
                </CardContent>
              </Card>
            ) : (
              Object.entries(STAGE_LABELS).map(([stage, label]) => {
                const stageRules = rulesByStage[stage] || [];
                if (stageRules.length === 0) return null;
                return (
                  <div key={stage}>
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <h2 className="font-semibold text-slate-700">Entering: {label}</h2>
                      <Badge variant="outline" className="text-xs">{stageRules.length} rule{stageRules.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="space-y-3">
                      {stageRules.map(rule => (
                        <WorkflowRuleCard
                          key={rule.id}
                          rule={rule}
                          onEdit={handleEdit}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube2 className="w-5 h-5 text-blue-500" />
                  Test a Stage Transition
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500">Select a real transaction and stage transition to fire the workflow engine and preview what happens.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Transaction</label>
                    <Select value={testTransactionId} onValueChange={setTestTransactionId}>
                      <SelectTrigger><SelectValue placeholder="Select transaction" /></SelectTrigger>
                      <SelectContent>
                        {transactions.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.id.slice(0, 8)}... ({t.current_stage?.replace(/_/g, ' ')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">From Stage</label>
                    <Select value={testFromStage} onValueChange={setTestFromStage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">To Stage</label>
                    <Select value={testToStage} onValueChange={setTestToStage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleTest} disabled={isTesting || !testTransactionId}>
                  {isTesting ? 'Running...' : 'Run Workflow Test'}
                </Button>

                {testResult && (
                  <div className="mt-4 p-4 bg-slate-900 rounded-lg text-green-400 font-mono text-xs overflow-auto max-h-64">
                    <pre>{JSON.stringify(testResult, null, 2)}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Workflow Rule' : 'New Workflow Rule'}</DialogTitle>
          </DialogHeader>
          <StageWorkflowRuleForm
            rule={editingRule}
            markets={markets}
            onSave={handleSave}
            onCancel={() => setDialogOpen(false)}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}