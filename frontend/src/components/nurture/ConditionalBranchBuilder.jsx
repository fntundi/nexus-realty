import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, GitBranch } from 'lucide-react';

export default function ConditionalBranchBuilder({ step, onUpdate, allSteps }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    condition_type: 'email_opened',
    condition_details: {},
    next_step_id: '',
    alternative_step_id: ''
  });

  const conditionTypes = [
    { value: 'email_opened', label: 'Email Opened' },
    { value: 'email_clicked', label: 'Email Clicked' },
    { value: 'link_clicked', label: 'Specific Link Clicked' },
    { value: 'no_action', label: 'No Action Taken' },
    { value: 'task_completed', label: 'Task Completed' },
    { value: 'lead_score_change', label: 'Lead Score Change' },
    { value: 'days_elapsed', label: 'Days Elapsed' }
  ];

  const handleAddBranch = () => {
    const newBranch = {
      branch_id: `branch_${Date.now()}`,
      ...formData
    };

    if (editingBranch) {
      onUpdate({
        ...step,
        conditional_branches: step.conditional_branches.map(b =>
          b.branch_id === editingBranch.branch_id ? { ...editingBranch, ...formData } : b
        )
      });
      setEditingBranch(null);
    } else {
      onUpdate({
        ...step,
        conditional_branches: [...(step.conditional_branches || []), newBranch]
      });
    }

    setFormData({ condition_type: 'email_opened', condition_details: {}, next_step_id: '', alternative_step_id: '' });
    setShowDialog(false);
  };

  const handleDeleteBranch = (branchId) => {
    onUpdate({
      ...step,
      conditional_branches: step.conditional_branches.filter(b => b.branch_id !== branchId)
    });
  };

  const getStepLabel = (stepId) => {
    const foundStep = allSteps.find(s => s.step_id === stepId);
    return foundStep ? `Step ${foundStep.order}` : 'Unknown';
  };

  const getConditionLabel = (condition) => {
    const type = conditionTypes.find(t => t.value === condition.condition_type);
    return type ? type.label : condition.condition_type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Conditional Branches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step.conditional_branches && step.conditional_branches.length > 0 ? (
          <div className="space-y-3">
            {step.conditional_branches.map(branch => (
              <div key={branch.branch_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge className="mb-2">{getConditionLabel(branch)}</Badge>
                    <p className="text-sm text-slate-600">
                      If condition → {getStepLabel(branch.next_step_id)}
                      {branch.alternative_step_id && ` | Else → ${getStepLabel(branch.alternative_step_id)}`}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteBranch(branch.branch_id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No conditional branches added</p>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Conditional Branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Condition Type</Label>
                <Select
                  value={formData.condition_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, condition_type: value, condition_details: {} })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.condition_type === 'link_clicked' && (
                <div className="space-y-2">
                  <Label>Link URL</Label>
                  <Input
                    placeholder="https://example.com"
                    value={formData.condition_details.link_url || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        condition_details: { ...formData.condition_details, link_url: e.target.value }
                      })
                    }
                  />
                </div>
              )}

              {formData.condition_type === 'lead_score_change' && (
                <div className="space-y-2">
                  <Label>Score Threshold</Label>
                  <Input
                    type="number"
                    placeholder="75"
                    value={formData.condition_details.score_threshold || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        condition_details: { ...formData.condition_details, score_threshold: parseInt(e.target.value) }
                      })
                    }
                  />
                </div>
              )}

              {formData.condition_type === 'days_elapsed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <Input
                      type="number"
                      placeholder="7"
                      value={formData.condition_details.days || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condition_details: { ...formData.condition_details, days: parseInt(e.target.value) }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Comparison</Label>
                    <Select
                      value={formData.condition_details.comparison || 'greater_than'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          condition_details: { ...formData.condition_details, comparison: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>If Condition Met → Go To Step</Label>
                <Select value={formData.next_step_id} onValueChange={(value) => setFormData({ ...formData, next_step_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select step" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSteps.filter(s => s.step_id !== step.step_id).map(s => (
                      <SelectItem key={s.step_id} value={s.step_id}>
                        Step {s.order}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Otherwise → Go To Step (Optional)</Label>
                <Select
                  value={formData.alternative_step_id}
                  onValueChange={(value) => setFormData({ ...formData, alternative_step_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select step" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSteps.filter(s => s.step_id !== step.step_id).map(s => (
                      <SelectItem key={s.step_id} value={s.step_id}>
                        Step {s.order}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddBranch}>
                  {editingBranch ? 'Update' : 'Add'} Branch
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}