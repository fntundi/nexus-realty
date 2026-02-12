import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function CRMConnectionConfig() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    crm_type: 'salesforce',
    enabled: false,
    salesforce_config: {
      instance_url: '',
      sync_direction: 'bidirectional',
      auto_sync_enabled: true,
      sync_interval_minutes: 30
    },
    hubspot_config: {
      private_app_key: '',
      sync_direction: 'bidirectional',
      auto_sync_enabled: true,
      sync_interval_minutes: 30
    }
  });

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['crm-connections'],
    queryFn: () => base44.entities.CRMConnection.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CRMConnection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-connections'] });
      resetForm();
      toast.success('CRM connection created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CRMConnection.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-connections'] });
      resetForm();
      toast.success('CRM connection updated');
    }
  });

  const testMutation = useMutation({
    mutationFn: async (connectionId) => {
      const connection = connections.find(c => c.id === connectionId);
      if (connection.crm_type === 'salesforce' && !connection.salesforce_config?.instance_url) {
        throw new Error('Salesforce instance URL is required');
      }
      if (connection.crm_type === 'hubspot' && !connection.hubspot_config?.private_app_key) {
        throw new Error('HubSpot API key is required');
      }
      return base44.functions.invoke('testCRMConnection', { connection_id: connectionId });
    },
    onSuccess: () => {
      toast.success('Connection test passed');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      crm_type: 'salesforce',
      enabled: false,
      salesforce_config: {
        instance_url: '',
        sync_direction: 'bidirectional',
        auto_sync_enabled: true,
        sync_interval_minutes: 30
      },
      hubspot_config: {
        private_app_key: '',
        sync_direction: 'bidirectional',
        auto_sync_enabled: true,
        sync_interval_minutes: 30
      }
    });
  };

  const handleSubmit = () => {
    if (formData.enabled) {
      if (formData.crm_type === 'salesforce' && !formData.salesforce_config.instance_url) {
        toast.error('Salesforce instance URL is required');
        return;
      }
      if (formData.crm_type === 'hubspot' && !formData.hubspot_config.private_app_key) {
        toast.error('HubSpot API key is required');
        return;
      }
    }

    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusIcon = (connection) => {
    if (!connection.enabled) return <Badge variant="outline">Disabled</Badge>;
    if (connection.last_sync_status === 'success') return <Badge className="bg-green-600">Connected</Badge>;
    if (connection.last_sync_status === 'failed') return <Badge className="bg-red-600">Error</Badge>;
    return <Badge className="bg-yellow-600">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Active CRM Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-slate-500">Loading...</div>
          ) : connections.length === 0 ? (
            <div className="text-center py-6 text-slate-500">No CRM connections configured</div>
          ) : (
            <div className="space-y-3">
              {connections.map(conn => (
                <div key={conn.id} className="p-4 border rounded-lg flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-slate-900 capitalize">{conn.crm_type}</h3>
                      {getStatusIcon(conn)}
                    </div>
                    {conn.last_sync_date && (
                      <p className="text-xs text-slate-600">
                        Last sync: {new Date(conn.last_sync_date).toLocaleString()}
                      </p>
                    )}
                    {conn.last_sync_error && (
                      <div className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {conn.last_sync_error}
                      </div>
                    )}
                    {conn.sync_stats && (
                      <div className="text-xs text-slate-600 mt-2">
                        <p>Leads synced: {conn.sync_stats.leads_synced} | Tasks created: {conn.sync_stats.tasks_created}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testMutation.mutate(conn.id)}
                      disabled={testMutation.isPending}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(conn.id);
                        setFormData(conn);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit' : 'Add'} CRM Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CRM Type Selection */}
          <div className="space-y-2">
            <Label>CRM System</Label>
            <Select
              value={formData.crm_type}
              onValueChange={(value) => setFormData({ ...formData, crm_type: value })}
              disabled={editingId !== null}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salesforce">Salesforce</SelectItem>
                <SelectItem value="hubspot">HubSpot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-slate-900 cursor-pointer">
              Enable this integration
            </label>
          </div>

          {/* Salesforce Config */}
          {formData.crm_type === 'salesforce' && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-900">Salesforce Configuration</h3>
              
              {formData.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Instance URL *</Label>
                    <Input
                      placeholder="https://yourinstance.salesforce.com"
                      value={formData.salesforce_config.instance_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salesforce_config: {
                            ...formData.salesforce_config,
                            instance_url: e.target.value
                          }
                        })
                      }
                    />
                    <p className="text-xs text-slate-600">Your Salesforce organization URL</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Sync Direction</Label>
                    <Select
                      value={formData.salesforce_config.sync_direction}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          salesforce_config: {
                            ...formData.salesforce_config,
                            sync_direction: value
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_way_to_crm">Push to Salesforce Only</SelectItem>
                        <SelectItem value="one_way_from_crm">Pull from Salesforce Only</SelectItem>
                        <SelectItem value="bidirectional">Bidirectional Sync</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Auto-Sync Interval (minutes)</Label>
                    <Input
                      type="number"
                      min="5"
                      value={formData.salesforce_config.sync_interval_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salesforce_config: {
                            ...formData.salesforce_config,
                            sync_interval_minutes: parseInt(e.target.value)
                          }
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HubSpot Config */}
          {formData.crm_type === 'hubspot' && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-900">HubSpot Configuration</h3>
              
              {formData.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Private App Access Key *</Label>
                    <Input
                      type="password"
                      placeholder="pat-..."
                      value={formData.hubspot_config.private_app_key}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hubspot_config: {
                            ...formData.hubspot_config,
                            private_app_key: e.target.value
                          }
                        })
                      }
                    />
                    <p className="text-xs text-slate-600">
                      Create a private app in HubSpot Developer Portal with appropriate scopes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Sync Direction</Label>
                    <Select
                      value={formData.hubspot_config.sync_direction}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          hubspot_config: {
                            ...formData.hubspot_config,
                            sync_direction: value
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_way_to_crm">Push to HubSpot Only</SelectItem>
                        <SelectItem value="one_way_from_crm">Pull from HubSpot Only</SelectItem>
                        <SelectItem value="bidirectional">Bidirectional Sync</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Auto-Sync Interval (minutes)</Label>
                    <Input
                      type="number"
                      min="5"
                      value={formData.hubspot_config.sync_interval_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hubspot_config: {
                            ...formData.hubspot_config,
                            sync_interval_minutes: parseInt(e.target.value)
                          }
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Update' : 'Create'} Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}