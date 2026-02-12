import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskTemplates() {
  const queryClient = useQueryClient();
  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', selectedMarketId],
    queryFn: () => base44.entities.Milestone.filter({ market_id: selectedMarketId }),
    enabled: !!selectedMarketId
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stage: 'pre_qual',
    responsible_role: 'any',
    is_critical: false,
    required_for_next_stage: false,
    notify_roles: [],
    order: 0
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Milestone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Template created');
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Milestone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Template updated');
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Milestone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Template deleted');
    }
  });

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        name: milestone.name,
        description: milestone.description || '',
        stage: milestone.stage,
        responsible_role: milestone.responsible_role || 'any',
        is_critical: milestone.is_critical || false,
        required_for_next_stage: milestone.required_for_next_stage || false,
        notify_roles: milestone.notify_roles || [],
        order: milestone.order || 0
      });
    } else {
      setEditingMilestone(null);
      setFormData({
        name: '',
        description: '',
        stage: 'pre_qual',
        responsible_role: 'any',
        is_critical: false,
        required_for_next_stage: false,
        notify_roles: [],
        order: 0
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingMilestone(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      market_id: selectedMarketId
    };

    if (editingMilestone) {
      updateMutation.mutate({ id: editingMilestone.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleNotifyRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      notify_roles: prev.notify_roles.includes(role)
        ? prev.notify_roles.filter(r => r !== role)
        : [...prev.notify_roles, role]
    }));
  };

  const stages = [
    { value: 'pre_qual', label: 'Pre-Qualification' },
    { value: 'showing', label: 'Showing' },
    { value: 'offer', label: 'Offer' },
    { value: 'under_contract', label: 'Under Contract' },
    { value: 'closing', label: 'Closing' }
  ];

  const milestonesByStage = stages.map(stage => ({
    ...stage,
    items: milestones.filter(m => m.stage === stage.value).sort((a, b) => (a.order || 0) - (b.order || 0))
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Task Templates</h1>
          <p className="text-slate-600 mt-1">Create reusable task templates for transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Market</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a market..." />
              </SelectTrigger>
              <SelectContent>
                {markets.map(market => (
                  <SelectItem key={market.id} value={market.id}>
                    {market.name} ({market.state})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedMarketId && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Templates by Stage</h2>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>

            {milestonesByStage.map(stage => (
              <Card key={stage.value}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    {stage.label}
                    <Badge variant="outline" className="ml-2">
                      {stage.items.length} templates
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stage.items.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No templates for this stage</p>
                  ) : (
                    <div className="space-y-2">
                      {stage.items.map(milestone => (
                        <div
                          key={milestone.id}
                          className="flex items-start justify-between p-4 bg-white border rounded-lg hover:border-slate-300 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">{milestone.name}</h4>
                              {milestone.is_critical && (
                                <Badge className="bg-orange-100 text-orange-700">Critical</Badge>
                              )}
                              {milestone.required_for_next_stage && (
                                <Badge variant="outline" className="border-blue-300 text-blue-700">
                                  Required
                                </Badge>
                              )}
                            </div>
                            {milestone.description && (
                              <p className="text-sm text-slate-600 mb-2">{milestone.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Assigned to: <span className="font-medium">{milestone.responsible_role}</span></span>
                              {milestone.notify_roles?.length > 0 && (
                                <span>Notify: <span className="font-medium">{milestone.notify_roles.join(', ')}</span></span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDialog(milestone)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Delete this template?')) {
                                  deleteMutation.mutate(milestone.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showDialog && (
          <Dialog open onOpenChange={handleCloseDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingMilestone ? 'Edit Template' : 'Create Template'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    placeholder="e.g., Submit Pre-Approval Letter"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Provide details about this task..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(stage => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Responsible Role</Label>
                    <Select value={formData.responsible_role} onValueChange={(v) => setFormData({ ...formData, responsible_role: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Anyone</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="lender">Lender</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="critical"
                      checked={formData.is_critical}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_critical: checked })}
                    />
                    <Label htmlFor="critical" className="cursor-pointer">
                      Critical task (send notifications)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="required"
                      checked={formData.required_for_next_stage}
                      onCheckedChange={(checked) => setFormData({ ...formData, required_for_next_stage: checked })}
                    />
                    <Label htmlFor="required" className="cursor-pointer">
                      Required for next stage
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notify Roles (when completed)</Label>
                  <div className="space-y-2">
                    {['agent', 'buyer', 'lender', 'builder'].map(role => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`notify-${role}`}
                          checked={formData.notify_roles.includes(role)}
                          onCheckedChange={() => handleNotifyRoleToggle(role)}
                        />
                        <Label htmlFor={`notify-${role}`} className="cursor-pointer capitalize">
                          {role}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingMilestone ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}