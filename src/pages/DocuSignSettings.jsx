import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocuSignSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['docusign-config'],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: 'docusign_settings' });
      if (configs.length === 0) {
        return { id: null, enabled: false };
      }
      return { id: configs[0].id, ...configs[0].config_value };
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (enabled) => {
      if (config.id) {
        return base44.entities.AppConfig.update(config.id, {
          config_value: { enabled }
        });
      } else {
        return base44.entities.AppConfig.create({
          config_key: 'docusign_settings',
          config_value: { enabled },
          description: 'DocuSign e-signature integration settings'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docusign-config'] });
      toast.success('Settings updated');
    }
  });

  const checkSecrets = () => {
    // This would check if secrets are set (via a backend function)
    const secrets = [
      'DOCUSIGN_INTEGRATION_KEY',
      'DOCUSIGN_USER_ID', 
      'DOCUSIGN_ACCOUNT_ID',
      'DOCUSIGN_PRIVATE_KEY',
      'DOCUSIGN_BASE_PATH'
    ];
    return { configured: false, missing: secrets }; // Placeholder
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only administrators can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const secretsCheck = checkSecrets();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">DocuSign Settings</h1>
          <p className="text-slate-600 mt-1">Configure e-signature integration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>
              Enable or disable DocuSign e-signature functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enabled" className="text-base">
                  Enable DocuSign Integration
                </Label>
                <p className="text-sm text-slate-600">
                  Allow users to send documents for e-signature
                </p>
              </div>
              <Switch
                id="enabled"
                checked={config?.enabled || false}
                onCheckedChange={(checked) => updateConfigMutation.mutate(checked)}
                disabled={updateConfigMutation.isPending}
              />
            </div>

            {config?.enabled && !secretsCheck.configured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Required Environment Variables Missing</div>
                  <div className="text-sm space-y-1">
                    Please set the following environment variables in your app settings:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {secretsCheck.missing.map(secret => (
                        <li key={secret}><code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{secret}</code></li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {config?.enabled && secretsCheck.configured && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  DocuSign is properly configured and ready to use.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ol className="space-y-3">
              <li>
                <strong>Create a DocuSign Developer Account</strong>
                <p className="text-sm text-slate-600">Visit <a href="https://developers.docusign.com" target="_blank" rel="noopener noreferrer" className="text-blue-600">developers.docusign.com</a> and create a free developer account</p>
              </li>
              <li>
                <strong>Create an Integration Key</strong>
                <p className="text-sm text-slate-600">Go to Apps and Keys in your DocuSign admin panel and create a new integration key</p>
              </li>
              <li>
                <strong>Generate RSA Key Pair</strong>
                <p className="text-sm text-slate-600">Generate an RSA key pair for JWT authentication from the same page</p>
              </li>
              <li>
                <strong>Configure Environment Variables</strong>
                <p className="text-sm text-slate-600">Add the required environment variables to your app settings with the values from DocuSign</p>
              </li>
              <li>
                <strong>Enable Integration</strong>
                <p className="text-sm text-slate-600">Toggle the switch above to enable e-signature functionality</p>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}