import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import LeadScoringRuleForm from '../components/crm/LeadScoringRuleForm';

export default function LeadScoringRules() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['leadScoringRules'],
    queryFn: () => base44.entities.LeadScoringRule.list('-created_date')
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId) => base44.entities.LeadScoringRule.delete(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadScoringRules'] });
      toast.success('Rule deleted');
    }
  });

  const runScoringMutation = useMutation({
    mutationFn: () => base44.functions.invoke('calculateLeadScores'),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`Updated scores for ${response.data.results?.length || 0} contacts`);
    },
    onError: () => {
      toast.error('Failed to run lead scoring');
    }
  });

  const executeRulesMutation = useMutation({
    mutationFn: () => base44.functions.invoke('executeLeadScoringRules'),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['leadScoringRules'] });
      toast.success(`Executed ${response.data.executedRules?.length || 0} rule actions`);
    },
    onError: () => {
      toast.error('Failed to execute rules');
    }
  });

  const getActionBadge = (action) => {
    const variants = {
      reassign_lead: 'bg-blue-100 text-blue-800',
      create_task: 'bg-purple-100 text-purple-800',
      send_notification: 'bg-green-100 text-green-800'
    };
    return <Badge className={variants[action]}>{action.replace(/_/g, ' ')}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-96" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Lead Scoring Rules</h1>
            <p className="text-slate-600 mt-1">Configure automated lead scoring and rule-based actions</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Lead Scoring Rule'}</DialogTitle>
              </DialogHeader>
              <LeadScoringRuleForm 
                rule={editingRule}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingRule(null);
                  queryClient.invalidateQueries({ queryKey: ['leadScoringRules'] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={() => runScoringMutation.mutate()}
            disabled={runScoringMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {runScoringMutation.isPending ? 'Calculating...' : 'Calculate All Lead Scores'}
          </Button>
          <Button 
            onClick={() => executeRulesMutation.mutate()}
            disabled={executeRulesMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {executeRulesMutation.isPending ? 'Executing...' : 'Execute All Rules'}
          </Button>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">No rules configured yet</p>
              </CardContent>
            </Card>
          ) : (
            rules.map(rule => (
              <Card key={rule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{rule.name}</h3>
                        {rule.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                        {getActionBadge(rule.action_type)}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-slate-600 mb-3">{rule.description}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">Threshold: </span>
                          <span className="font-semibold text-slate-900">{rule.score_threshold}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Executions: </span>
                          <span className="font-semibold text-slate-900">{rule.execution_count || 0}</span>
                        </div>
                        {rule.last_execution && (
                          <div>
                            <span className="text-slate-500">Last Run: </span>
                            <span className="font-semibold text-slate-900">
                              {new Date(rule.last_execution).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => { setEditingRule(rule); setShowForm(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}