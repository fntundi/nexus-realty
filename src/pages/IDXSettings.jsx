import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Home, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function IDXSettings() {
  const queryClient = useQueryClient();
  const [selectedMarketId, setSelectedMarketId] = useState(null);
  const [marketConfigs, setMarketConfigs] = useState({});

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: markets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  // Initialize market configs from loaded data
  React.useEffect(() => {
    if (markets.length > 0) {
      const configs = {};
      markets.forEach(market => {
        configs[market.id] = market.idx_settings || {
          enabled: false,
          api_key: '',
          api_url: '',
          mls_id: '',
          sync_frequency: 'hourly'
        };
      });
      setMarketConfigs(configs);
      if (!selectedMarketId && markets.length > 0) {
        setSelectedMarketId(markets[0].id);
      }
    }
  }, [markets]);

  const updateMarketConfigMutation = useMutation({
    mutationFn: async ({ marketId, idx_settings }) => {
      return base44.entities.Market.update(marketId, { idx_settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      toast.success('IDX settings updated for market');
    },
    onError: (err) => {
      toast.error('Failed to update settings: ' + err.message);
    }
  });

  const handleToggle = (checked) => {
    if (!selectedMarketId) return;
    
    const currentConfig = marketConfigs[selectedMarketId] || {};
    const newConfig = {
      ...currentConfig,
      enabled: checked
    };

    setMarketConfigs(prev => ({
      ...prev,
      [selectedMarketId]: newConfig
    }));

    updateMarketConfigMutation.mutate({
      marketId: selectedMarketId,
      idx_settings: newConfig
    });
  };

  const handleSaveConfig = () => {
    if (!selectedMarketId) return;

    const config = marketConfigs[selectedMarketId];
    if (!config.api_key || !config.api_url || !config.mls_id) {
      toast.error('All fields are required');
      return;
    }

    updateMarketConfigMutation.mutate({
      marketId: selectedMarketId,
      idx_settings: { ...config, enabled: true }
    });
  };

  const updateField = (field, value) => {
    if (!selectedMarketId) return;
    setMarketConfigs(prev => ({
      ...prev,
      [selectedMarketId]: {
        ...prev[selectedMarketId],
        [field]: value
      }
    }));
  };

  if (marketsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const selectedMarket = markets.find(m => m.id === selectedMarketId);
  const currentConfig = selectedMarketId ? marketConfigs[selectedMarketId] : null;
  const isConfigured = currentConfig?.enabled && currentConfig?.api_key && currentConfig?.api_url && currentConfig?.mls_id;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">IDX Integration</h1>
          <p className="text-slate-600 mt-1">Configure IDX settings per market for real-time property listings</p>
        </div>

        {markets.length === 0 && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              No markets found. Please create markets first before configuring IDX.
            </AlertDescription>
          </Alert>
        )}

        {!isAdmin && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Only administrators can configure IDX integration settings.
            </AlertDescription>
          </Alert>
        )}

        {isAdmin && markets.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Select Market
                </CardTitle>
                <CardDescription>
                  Choose a market to configure its IDX settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map(market => (
                      <SelectItem key={market.id} value={market.id}>
                        {market.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedMarketId && currentConfig && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Integration Status - {selectedMarket?.name}</CardTitle>
                    <CardDescription>
                      Enable or disable IDX integration for this market
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="enabled" className="text-base">
                          Enable IDX Integration
                        </Label>
                        <p className="text-sm text-slate-600">
                          Connect to MLS data feeds to import property listings
                        </p>
                      </div>
                      <Switch
                        id="enabled"
                        checked={currentConfig.enabled || false}
                        onCheckedChange={handleToggle}
                        disabled={updateMarketConfigMutation.isPending}
                      />
                    </div>

                    {currentConfig.enabled && !isConfigured && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          IDX is enabled but not configured. Please provide the required settings below.
                        </AlertDescription>
                      </Alert>
                    )}

                    {isConfigured && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          IDX integration is enabled and configured for {selectedMarket?.name}. Listings will sync automatically.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {currentConfig.enabled && (
                  <Card>
                    <CardHeader>
                      <CardTitle>IDX Configuration - {selectedMarket?.name}</CardTitle>
                      <CardDescription>
                        Enter IDX provider credentials and MLS information for this market
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="api_key">API Key *</Label>
                        <Input
                          id="api_key"
                          type="password"
                          placeholder="Enter your IDX API key"
                          value={currentConfig.api_key || ''}
                          onChange={(e) => updateField('api_key', e.target.value)}
                        />
                        <p className="text-xs text-slate-500">
                          Your IDX provider API key for authentication
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="api_url">API URL *</Label>
                        <Input
                          id="api_url"
                          type="url"
                          placeholder="https://api.idxprovider.com/v1"
                          value={currentConfig.api_url || ''}
                          onChange={(e) => updateField('api_url', e.target.value)}
                        />
                        <p className="text-xs text-slate-500">
                          Base URL for your IDX provider's API endpoint
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mls_id">MLS ID *</Label>
                        <Input
                          id="mls_id"
                          placeholder="Enter your MLS ID"
                          value={currentConfig.mls_id || ''}
                          onChange={(e) => updateField('mls_id', e.target.value)}
                        />
                        <p className="text-xs text-slate-500">
                          Your Multiple Listing Service identification number
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sync_frequency">Sync Frequency</Label>
                        <Select
                          value={currentConfig.sync_frequency || 'hourly'}
                          onValueChange={(value) => updateField('sync_frequency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="manual">Manual Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                          How often to sync listings from MLS
                        </p>
                      </div>

                      <Button
                        onClick={handleSaveConfig}
                        disabled={!currentConfig.api_key || !currentConfig.api_url || !currentConfig.mls_id || updateMarketConfigMutation.isPending}
                        className="w-full"
                      >
                        {updateMarketConfigMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Save Configuration
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Real-time property listing data from MLS feeds</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatic updates when listings change or become available</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Access to detailed property information and photos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Compliance with MLS data display requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Integration with your existing property search and buyer tools</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {isConfigured && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800">
              <p className="mb-2">Your IDX integration is configured. To start importing listings:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Verify your API credentials are working correctly</li>
                <li>Set up automatic sync schedules (recommended: hourly)</li>
                <li>Configure property display settings and filters</li>
                <li>Test the integration with a sample property search</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}