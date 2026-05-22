import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Trash2, Plus, Edit } from 'lucide-react';

const ALERT_CONFIGS = [
  {
    id: 'high_value_deals',
    name: 'High-Value Deals',
    description: 'Alert when new deals enter pipeline above threshold',
    defaultThreshold: 500000
  },
  {
    id: 'closing_date_activity',
    name: 'Closing Date Activity',
    description: 'Alert for deals nearing close date without recent activity',
    defaultThreshold: 7
  },
  {
    id: 'performance_changes',
    name: 'Performance Changes',
    description: 'Alert when agent metrics change significantly',
    defaultThreshold: 15
  }
];

export default function AlertSettings() {
  const [user, setUser] = useState(null);
  const [editingAlert, setEditingAlert] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [markets, setMarkets] = useState([]);
  const [agents, setAgents] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const marketsData = await base44.entities.Market.list();
        const agentsData = await base44.entities.Agent.list();
        setMarkets(marketsData || []);
        setAgents(agentsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    })();
  }, []);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', user?.email],
    queryFn: () => user ? base44.entities.AlertConfig.filter({ user_email: user.email }) : [],
    enabled: !!user
  });

  const createAlertMutation = useMutation({
    mutationFn: (data) => base44.entities.AlertConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', user?.email] });
      setDialogOpen(false);
      setFormData({});
      setEditingAlert(null);
    }
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AlertConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', user?.email] });
      setDialogOpen(false);
      setFormData({});
      setEditingAlert(null);
    }
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id) => base44.entities.AlertConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', user?.email] })
  });

  const handleSaveAlert = () => {
    if (!formData.alert_type || !formData.threshold_value) return;

    const alertData = {
      user_email: user.email,
      alert_type: formData.alert_type,
      enabled: formData.enabled ?? true,
      threshold_value: parseFloat(formData.threshold_value),
      recipient_emails: formData.recipient_emails || [],
      frequency: formData.frequency || 'daily',
      market_filters: formData.market_filters || [],
      agent_filters: formData.agent_filters || []
    };

    if (editingAlert) {
      updateAlertMutation.mutate({ id: editingAlert.id, data: alertData });
    } else {
      createAlertMutation.mutate(alertData);
    }
  };

  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    setFormData(alert);
    setDialogOpen(true);
  };

  const handleNewAlert = () => {
    setEditingAlert(null);
    setFormData({ enabled: true, frequency: 'daily' });
    setDialogOpen(true);
  };

  const getAlertConfig = (typeId) => ALERT_CONFIGS.find(c => c.id === typeId);
  const getThresholdLabel = (typeId) => {
    if (typeId === 'high_value_deals') return '$';
    if (typeId === 'closing_date_activity') return 'days';
    if (typeId === 'performance_changes') return '%';
    return '';
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Alert Settings</h1>
        <p className="text-slate-600">Configure automated email alerts for key business events</p>
      </div>

      <div className="grid gap-4">
        {ALERT_CONFIGS.map((config) => {
          const alertConfig = alerts?.find(a => a.alert_type === config.id);
          return (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{config.description}</p>
                  </div>
                  <Badge variant={alertConfig?.enabled ? 'default' : 'outline'}>
                    {alertConfig?.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {alertConfig ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Threshold:</span>
                        <span className="ml-2">{getThresholdLabel(config.id)}{alertConfig.threshold_value}</span>
                      </div>
                      <div>
                        <span className="font-medium">Frequency:</span>
                        <span className="ml-2 capitalize">{alertConfig.frequency}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Recipients:</span>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="outline">{user.email}</Badge>
                          {alertConfig.recipient_emails?.map(email => (
                            <Badge key={email} variant="outline">{email}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAlert(alertConfig)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAlertMutation.mutate(alertConfig.id)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm mb-4">Not configured yet</p>
                )}
                {!alertConfig && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ alert_type: config.id, threshold_value: config.defaultThreshold });
                      setEditingAlert(null);
                      setDialogOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Configure
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAlert ? 'Edit Alert' : 'Configure Alert'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Alert Type</Label>
              <Select value={formData.alert_type} onValueChange={(v) => setFormData({ ...formData, alert_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_CONFIGS.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Threshold ({getThresholdLabel(formData.alert_type)})</Label>
              <Input
                type="number"
                value={formData.threshold_value || ''}
                onChange={(e) => setFormData({ ...formData, threshold_value: e.target.value })}
              />
            </div>

            <div>
              <Label>Frequency</Label>
              <Select value={formData.frequency || 'daily'} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Additional Recipients</Label>
              <p className="text-xs text-slate-500 mb-2">{user?.email} is always included</p>
              <Input
                placeholder="email@example.com (comma separated)"
                value={formData.recipient_emails?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  recipient_emails: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Market Filters (optional)</Label>
              <p className="text-xs text-slate-500">Leave empty to monitor all markets</p>
              <Select value={formData.market_filters?.[0] || ''} onValueChange={(v) => setFormData({
                ...formData,
                market_filters: v ? [v] : []
              })}>
                <SelectTrigger>
                  <SelectValue placeholder="All markets" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="enabled"
                checked={formData.enabled ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled" className="cursor-pointer">Enable this alert</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAlert}>Save Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}