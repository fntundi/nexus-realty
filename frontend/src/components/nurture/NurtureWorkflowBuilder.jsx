import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown } from 'lucide-react';

export default function NurtureWorkflowBuilder({ workflow = null, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(workflow || {
    name: '',
    description: '',
    trigger_type: 'lead_score_threshold',
    trigger_config: { score_threshold: 50 },
    sequence_steps: [],
    is_active: true
  });

  const [newStep, setNewStep] = useState({
    order: 1,
    action_type: 'email',
    delay_hours: 0,
    task_type: 'follow_up'
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list()
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (workflow?.id) {
        return await base44.entities.NurtureWorkflow.update(workflow.id, data);
      } else {
        return await base44.entities.NurtureWorkflow.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-workflows'] });
      onSuccess?.();
    }
  });

  const handleAddStep = () => {
    if (!newStep.action_type) return;

    const step = {
      ...newStep,
      order: formData.sequence_steps.length + 1
    };

    setFormData({
      ...formData,
      sequence_steps: [...formData.sequence_steps, step]
    });

    setNewStep({
      order: formData.sequence_steps.length + 2,
      action_type: 'email',
      delay_hours: 0,
      task_type: 'follow_up'
    });
  };

  const handleRemoveStep = (index) => {
    const updated = formData.sequence_steps.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      sequence_steps: updated
    });
  };

  const handleSave = () => {
    if (!formData.name || formData.sequence_steps.length === 0) {
      alert('Please provide a name and at least one step');
      return;
    }

    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hot Lead Nurture Sequence"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this workflow"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Trigger Type</label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_score_threshold">Lead Score</SelectItem>
                  <SelectItem value="deal_stage">Deal Stage</SelectItem>
                  <SelectItem value="no_activity">No Activity</SelectItem>
                  <SelectItem value="new_lead">New Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.trigger_type === 'lead_score_threshold' && (
              <div>
                <label className="text-sm font-medium">Score Threshold</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.trigger_config?.score_threshold || 50}
                  onChange={(e) => setFormData({
                    ...formData,
                    trigger_config: { ...formData.trigger_config, score_threshold: parseInt(e.target.value) }
                  })}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sequence Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email & Task Sequence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.sequence_steps.length > 0 && (
            <div className="space-y-3">
              {formData.sequence_steps.map((step, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex gap-2 items-center mb-2">
                        <Badge variant="outline">Step {step.order}</Badge>
                        <Badge className={
                          step.action_type === 'email' ? 'bg-blue-100 text-blue-800' :
                          step.action_type === 'task' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {step.action_type}
                        </Badge>
                      </div>

                      {step.action_type === 'email' || step.action_type === 'both' ? (
                        <p className="text-sm text-slate-700 mb-2">
                          📧 <span className="font-medium">Email:</span> {templates.find(t => t.id === step.email_template_id)?.name || 'Select template'}
                        </p>
                      ) : null}

                      {step.action_type === 'task' || step.action_type === 'both' ? (
                        <p className="text-sm text-slate-700 mb-2">
                          ✓ <span className="font-medium">Task:</span> {step.task_title || 'Add task title'}
                        </p>
                      ) : null}

                      <p className="text-xs text-slate-600">
                        ⏱️ Delay: {step.delay_hours} hours
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStep(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Step */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Add New Step</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Action Type</label>
                <Select
                  value={newStep.action_type}
                  onValueChange={(value) => setNewStep({ ...newStep, action_type: value })}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="both">Email + Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Delay (hours)</label>
                <Input
                  type="number"
                  min="0"
                  value={newStep.delay_hours}
                  onChange={(e) => setNewStep({ ...newStep, delay_hours: parseInt(e.target.value) })}
                  placeholder="0"
                  size="sm"
                />
              </div>
            </div>

            {['email', 'both'].includes(newStep.action_type) && (
              <div>
                <label className="text-xs font-medium text-slate-600">Email Template</label>
                <Select
                  value={newStep.email_template_id || ''}
                  onValueChange={(value) => setNewStep({ ...newStep, email_template_id: value })}
                >
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {['task', 'both'].includes(newStep.action_type) && (
              <div>
                <label className="text-xs font-medium text-slate-600">Task Title</label>
                <Input
                  value={newStep.task_title || ''}
                  onChange={(e) => setNewStep({ ...newStep, task_title: e.target.value })}
                  placeholder="e.g., Follow up call with buyer"
                  size="sm"
                />
              </div>
            )}

            <Button
              size="sm"
              onClick={handleAddStep}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {saveMutation.isPending ? 'Saving...' : 'Save Workflow'}
      </Button>
    </div>
  );
}