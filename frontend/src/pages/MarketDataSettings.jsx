import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketDataSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['market-data-configs'],
    queryFn: () => base44.entities.MarketDataConfig.list()
  });

  const existingConfig = configs[0];

  const [formData, setFormData] = useState(existingConfig || {
    provider: 'zillow',
    is_enabled: false,
    api_key: '',
    api_url: '',
    rate_limit_per_day: 1000,
    cache_duration_hours: 24,
    supported_features: {
      property_estimates: true,
      market_trends: true,
      neighborhood_stats: true,
      comparable_sales: true
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (existingConfig) {
        return base44.entities.MarketDataConfig.update(existingConfig.id, data);
      }
      return base44.entities.MarketDataConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['market-data-configs']);
      toast.success('Market data settings saved');
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('fetchMarketData', {
        address: '123 Test St, Austin, TX 78701',
        zip_code: '78701'
      });
      return result.data;
    },
    onSuccess: () => {
      toast.success('Connection test successful!');
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
    }
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">Admin access required</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Market Data Integration</h1>
          <p className="text-slate-600 mt-1">Configure real estate market data API for property insights</p>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Setup Instructions</p>
                <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
                  <li>Choose your market data provider (Zillow, Redfin, or Realtor.com)</li>
                  <li>Obtain API credentials from your chosen provider</li>
                  <li>Enter your API key and base URL below</li>
                  <li>Test the connection before enabling</li>
                  <li>Monitor your daily API usage to stay within limits</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration
              </CardTitle>
              {existingConfig && (
                <Badge className={formData.is_enabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                  {formData.is_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <div>
              <Label>Market Data Provider</Label>
              <Select value={formData.provider} onValueChange={(val) => setFormData({...formData, provider: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zillow">Zillow</SelectItem>
                  <SelectItem value="redfin">Redfin</SelectItem>
                  <SelectItem value="realtor">Realtor.com</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Provider-specific API documentation is required for setup
              </p>
            </div>

            {/* API Credentials */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                  placeholder="Enter your API key..."
                />
              </div>
              <div>
                <Label>API Base URL</Label>
                <Input
                  value={formData.api_url}
                  onChange={(e) => setFormData({...formData, api_url: e.target.value})}
                  placeholder="https://api.example.com/v1"
                />
              </div>
            </div>

            {/* Rate Limiting */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Daily API Call Limit</Label>
                <Input
                  type="number"
                  value={formData.rate_limit_per_day}
                  onChange={(e) => setFormData({...formData, rate_limit_per_day: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Cache Duration (hours)</Label>
                <Input
                  type="number"
                  value={formData.cache_duration_hours}
                  onChange={(e) => setFormData({...formData, cache_duration_hours: Number(e.target.value)})}
                />
              </div>
            </div>

            {/* Usage Stats */}
            {existingConfig && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm font-medium text-slate-900 mb-2">Today's Usage</div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {existingConfig.calls_today || 0}
                  </span>
                  <span className="text-sm text-slate-600">
                    / {existingConfig.rate_limit_per_day} calls
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((existingConfig.calls_today || 0) / existingConfig.rate_limit_per_day) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Feature Toggles */}
            <div className="space-y-3">
              <Label>Enabled Features</Label>
              <div className="space-y-2">
                {Object.entries(formData.supported_features || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        supported_features: {
                          ...formData.supported_features,
                          [key]: checked
                        }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <div className="font-medium text-slate-900">Enable Market Data Integration</div>
                <p className="text-sm text-slate-600">Make data available throughout the app</p>
              </div>
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({...formData, is_enabled: checked})}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => testConnectionMutation.mutate()}
                disabled={!formData.api_key || testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}