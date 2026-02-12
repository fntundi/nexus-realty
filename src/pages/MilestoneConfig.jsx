import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MilestoneConfig() {
  const queryClient = useQueryClient();
  const [selectedMarket, setSelectedMarket] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stage: 'pre_qual',
    order: 1,
    is_critical: false,
    required_for_next_stage: false,
    responsible_role: 'any',
    notify_roles: []
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', selectedMarket],
    queryFn: () => base44.entities.Milestone.filter({ market_id: selectedMarket }, 'order'),
    enabled: !!selectedMarket
  });

  const createMilestoneMutation = useMutation({
    mutationFn: (data) => base44.entities.Milestone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Milestone created');
      handleCloseDialog();
    }
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Milestone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Milestone updated');
      handleCloseDialog();
    }
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (id) => base44.entities.Milestone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Milestone deleted');
    }
  });

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        name: milestone.name,
        description: milestone.description || '',
        stage: milestone.stage,
        order: milestone.order,
        is_critical: milestone.is_critical || false,
        required_for_next_stage: milestone.required_for_next_stage || false,
        responsible_role: milestone.responsible_role || 'any',
        notify_roles: milestone.notify_roles || []
      });
    } else {
      setEditingMilestone(null);
      setFormData({
        name: '',
        description: '',
        stage: 'pre_qual',
        order: milestones.length + 1,
        is_critical: false,
        required_for_next_stage: false,
        responsible_role: 'any',
        notify_roles: []
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMilestone(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !selectedMarket) {
      toast.error('Please fill in required fields');
      return;
    }

    const data = {
      ...formData,
      market_id: selectedMarket
    };

    if (editingMilestone) {
      updateMilestoneMutation.mutate({ id: editingMilestone.id, data });
    } else {
      createMilestoneMutation.mutate(data);
    }
  };

  const toggleNotifyRole = (role) => {
    setFormData(prev => ({
      ...prev,
      notify_roles: prev.notify_roles.includes(role)
        ? prev.notify_roles.filter(r => r !== role)
        : [...prev.notify_roles, role]
    }));
  };

  const stageLabels = {
    pre_qual: 'Pre-Qualification',
    showing: 'Showing',
    offer: 'Offer',
    under_contract: 'Under Contract',
    closing: 'Closing'
  };

  const groupedMilestones = Object.keys(stageLabels).reduce((acc, stage) => {
    acc[stage] = milestones.filter(m => m.stage === stage);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Milestone Configuration</h1>
            <p className="text-slate-600 mt-1">Define transaction milestones and tasks</p>
          </div>
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select Market" />
            </SelectTrigger>
            <SelectContent>
              {markets.map(market => (
                <SelectItem key={market.id} value={market.id}>
                  {market.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedMarket ? (
          <>
            <div className="flex justify-end">
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedMilestones).map(([stage, stageMilestones]) => (
                <Card key={stage}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{stageLabels[stage]}</span>
                      <Badge variant="outline">{stageMilestones.length} milestones</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stageMilestones.length > 0 ? (
                      <div className="space-y-3">
                        {stageMilestones.map(milestone => (
                          <div
                            key={milestone.id}
                            className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-slate-900">{milestone.name}</span>
                                {milestone.is_critical && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Critical
                                  </Badge>
                                )}
                                {milestone.required_for_next_stage && (
                                  <Badge className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Required
                                  </Badge>
                                )}
                              </div>
                              {milestone.description && (
                                <p className="text-sm text-slate-600 mb-2">{milestone.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>Order: {milestone.order}</span>
                                <span>Responsible: {milestone.responsible_role}</span>
                                {milestone.notify_roles?.length > 0 && (
                                  <span>Notifies: {milestone.notify_roles.join(', ')}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(milestone)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMilestoneMutation.mutate(milestone.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-500">
                        No milestones for this stage yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Select a market to manage milestones
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Milestone Name *</Label>
                  <Input
                    placeholder="e.g., Pre-Approval Obtained"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What needs to be done..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Transaction Stage *</Label>
                  <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(stageLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsible Role</Label>
                  <Select value={formData.responsible_role} onValueChange={(v) => setFormData({ ...formData, responsible_role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="lender">Lender</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Settings</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.is_critical}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_critical: checked })}
                      />
                      <span className="text-sm">Critical (triggers notifications)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.required_for_next_stage}
                        onCheckedChange={(checked) => setFormData({ ...formData, required_for_next_stage: checked })}
                      />
                      <span className="text-sm">Required for next stage</span>
                    </div>
                  </div>
                </div>

                {formData.is_critical && (
                  <div className="col-span-2 space-y-2">
                    <Label>Notify Roles (when completed)</Label>
                    <div className="flex gap-3">
                      {['agent', 'buyer', 'lender', 'builder'].map(role => (
                        <div key={role} className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.notify_roles.includes(role)}
                            onCheckedChange={() => toggleNotifyRole(role)}
                          />
                          <span className="text-sm capitalize">{role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}>
                  {editingMilestone ? 'Update' : 'Create'} Milestone
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}