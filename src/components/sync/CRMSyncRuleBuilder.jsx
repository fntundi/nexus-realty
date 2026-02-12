import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function CRMSyncRuleBuilder() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'leads',
    enabled: true,
    sync_direction: 'bidirectional',
    sync_schedule: {
      frequency: 'daily',
      time_of_day: '09:00'
    },
    field_mappings: [],
    filters: [],
    conflict_resolution: 'last_modified_wins'
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['crm-connections'],
    queryFn: () => base44.entities.CRMConnection.list()
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['crm-sync-rules'],
    queryFn: () => base44.entities.CRMSyncRule.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.CRMSyncRule.create({
        ...data,
        crm_connection_id: selectedConnectionId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-sync-rules'] });
      resetForm();
      toast.success('Sync rule created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CRMSyncRule.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-sync-rules'] });
      resetForm();
      toast.success('Sync rule updated');
    }
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setSelectedConnectionId('');
    setFormData({
      rule_name: '',
      rule_type: 'leads',
      enabled: true,
      sync_direction: 'bidirectional',
      sync_schedule: {
        frequency: 'daily',
        time_of_day: '09:00'
      },
      field_mappings: [],
      filters: [],
      conflict_resolution: 'last_modified_wins'
    });
  };

  const addFieldMapping = () => {
    setFormData({
      ...formData,
      field_mappings: [
        ...formData.field_mappings,
        {
          id: `mapping-${Date.now()}`,
          local_field: '',
          crm_field: '',
          sync_direction: 'bidirectional'
        }
      ]
    });
  };

  const removeFieldMapping = (mappingId) => {
    setFormData({
      ...formData,
      field_mappings: formData.field_mappings.filter(m => m.id !== mappingId)
    });
  };

  const updateFieldMapping = (mappingId, field, value) => {
    setFormData({
      ...formData,
      field_mappings: formData.field_mappings.map(m =>
        m.id === mappingId ? { ...m, [field]: value } : m
      )
    });
  };

  const addFilter = () => {
    setFormData({
      ...formData,
      filters: [
        ...formData.filters,
        {
          id: `filter-${Date.now()}`,
          field: '',
          operator: 'equals',
          value: ''
        }
      ]
    });
  };

  const removeFilter = (filterId) => {
    setFormData({
      ...formData,
      filters: formData.filters.filter(f => f.id !== filterId)
    });
  };

  const handleSubmit = () => {
    if (!formData.rule_name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    if (!selectedConnectionId && !editingId) {
      toast.error('Select a CRM connection');
      return;
    }

    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRuleConnection = (rule) => {
    return connections.find(c => c.id === rule.crm_connection_id);
  };

  return (
    <div className="space-y-6">
      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sync Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-slate-500 text-sm">No sync rules configured</p>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => {
                const connection = getRuleConnection(rule);
                return (
                  <div
                    key={rule.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900">{rule.rule_name}</h4>
                        <p className="text-xs text-slate-500">
                          {connection?.crm_type} • {rule.rule_type} • {rule.sync_schedule?.frequency}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(rule.id);
                            setSelectedConnectionId(rule.crm_connection_id);
                            setFormData(rule);
                            setIsCreating(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>

                    {rule.last_sync_date && (
                      <div className="text-xs text-slate-600">
                        Last sync: {new Date(rule.last_sync_date).toLocaleString()}
                        {rule.last_sync_status === 'failed' && (
                          <span className="text-red-600 ml-2">• Error: {rule.sync_stats?.last_error_message}</span>
                        )}
                      </div>
                    )}

                    {rule.sync_stats && (
                      <div className="text-xs text-slate-600">
                        Synced: {rule.sync_stats.records_synced} | Created: {rule.sync_stats.records_created} | Updated: {rule.sync_stats.records_updated}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Builder */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit' : 'Create'} Sync Rule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>CRM Connection</Label>
              <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId} disabled={editingId !== null}>
                <SelectTrigger>
                  <SelectValue placeholder="Select CRM connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections
                    .filter(c => c.enabled)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.crm_type}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                placeholder="e.g., Daily Lead Sync"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sync Direction</Label>
                <Select
                  value={formData.sync_direction}
                  onValueChange={(value) => setFormData({ ...formData, sync_direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to_crm">To CRM Only</SelectItem>
                    <SelectItem value="from_crm">From CRM Only</SelectItem>
                    <SelectItem value="bidirectional">Bidirectional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              <h3 className="font-medium text-slate-900">Sync Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={formData.sync_schedule.frequency}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        sync_schedule: { ...formData.sync_schedule, frequency: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.sync_schedule.frequency !== 'immediate' && (
                  <div className="space-y-2">
                    <Label>Time (HH:MM)</Label>
                    <Input
                      type="time"
                      value={formData.sync_schedule.time_of_day}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sync_schedule: { ...formData.sync_schedule, time_of_day: e.target.value }
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Field Mappings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">Field Mappings</h3>
                <Button size="sm" onClick={addFieldMapping} className="gap-1">
                  <Plus className="w-3 h-3" />
                  Add Mapping
                </Button>
              </div>

              <div className="space-y-2">
                {formData.field_mappings.map(mapping => (
                  <div key={mapping.id} className="flex gap-2 items-end">
                    <Input
                      placeholder="Local field"
                      value={mapping.local_field}
                      onChange={(e) =>
                        updateFieldMapping(mapping.id, 'local_field', e.target.value)
                      }
                      className="flex-1 h-8 text-xs"
                    />
                    <span className="text-xs text-slate-500">→</span>
                    <Input
                      placeholder="CRM field"
                      value={mapping.crm_field}
                      onChange={(e) =>
                        updateFieldMapping(mapping.id, 'crm_field', e.target.value)
                      }
                      className="flex-1 h-8 text-xs"
                    />
                    <Select
                      value={mapping.sync_direction}
                      onValueChange={(value) =>
                        updateFieldMapping(mapping.id, 'sync_direction', value)
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to_crm">To CRM</SelectItem>
                        <SelectItem value="from_crm">From CRM</SelectItem>
                        <SelectItem value="bidirectional">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFieldMapping(mapping.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Update' : 'Create'} Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCreating && (
        <Button onClick={() => setIsCreating(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Create New Rule
        </Button>
      )}
    </div>
  );
}