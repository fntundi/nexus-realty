import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Home } from 'lucide-react';
import { toast } from 'sonner';

export default function IDXSettings() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [mlsId, setMlsId] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['idx-config'],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: 'idx_settings' });
      if (configs.length === 0) {
        return { id: null, enabled: false };
      }
      const configData = { id: configs[0].id, ...configs[0].config_value };
      
      // Set form values from config
      if (configData.enabled) {
        setApiKey(configData.api_key || '');
        setApiUrl(configData.api_url || '');
        setMlsId(configData.mls_id || '');
      }
      
      return configData;
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ enabled, api_key, api_url, mls_id }) => {
      const configValue = {
        enabled,
        ...(enabled && {
          api_key,
          api_url,
          mls_id
        })
      };

      if (config.id) {
        return base44.entities.AppConfig.update(config.id, {
          config_value: configValue
        });
      } else {
        return base44.entities.AppConfig.create({
          config_key: 'idx_settings',
          config_value: configValue,
          description: 'IDX (Internet Data Exchange) integration settings'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idx-config'] });
      toast.success('IDX settings updated');
    },
    onError: (err) => {
      toast.error('Failed to update settings: ' + err.message);
    }
  });

  const handleToggle = (checked) => {
    if (checked) {
      // When enabling, just toggle - user will configure next
      updateConfigMutation.mutate({ 
        enabled: true,
        api_key: apiKey,
        api_url: apiUrl,
        mls_id: mlsId
      });
    } else {
      // When disabling, clear all
      updateConfigMutation.mutate({ enabled: false });
      setApiKey('');
      setApiUrl('');
      setMlsId('');
    }
  };

  const handleSaveConfig = () => {
    if (!apiKey || !apiUrl || !mlsId) {
      toast.error('All fields are required');
      return;
    }

    updateConfigMutation.mutate({
      enabled: true,
      api_key: apiKey,
      api_url: apiUrl,
      mls_id: mlsId
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isConfigured = config?.enabled && config?.api_key && config?.api_url && config?.mls_id;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">IDX Integration</h1>
          <p className="text-slate-600 mt-1">Connect to MLS data feeds for real-time property listings</p>
        </div>

        {!isAdmin && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Only administrators can configure IDX integration settings.
            </AlertDescription>
          </Alert>
        )}

        {isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
                <CardDescription>
                  Enable or disable IDX integration functionality
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
                    checked={config?.enabled || false}
                    onCheckedChange={handleToggle}
                    disabled={updateConfigMutation.isPending}
                  />
                </div>

                {config?.enabled && !isConfigured && (
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
                      IDX integration is enabled and configured. Listings will sync automatically.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {config?.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>IDX Configuration</CardTitle>
                  <CardDescription>
                    Enter your IDX provider credentials and MLS information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api_key">API Key *</Label>
                    <Input
                      id="api_key"
                      type="password"
                      placeholder="Enter your IDX API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
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
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
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
                      value={mlsId}
                      onChange={(e) => setMlsId(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      Your Multiple Listing Service identification number
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveConfig}
                    disabled={!apiKey || !apiUrl || !mlsId || updateConfigMutation.isPending}
                    className="w-full"
                  >
                    {updateConfigMutation.isPending ? (
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