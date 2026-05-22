import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CRMConnectionConfig from '../components/integrations/CRMConnectionConfig';
import { Zap, Link2 } from 'lucide-react';

export default function CRMIntegrationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Link2 className="w-8 h-8 text-blue-600" />
            CRM Integrations
          </h1>
          <p className="text-slate-600">
            Connect your CRM system for seamless two-way data synchronization of leads, tasks, and engagement metrics
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salesforce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Sync leads and tasks bidirectionally. Automatically create leads in Salesforce and pull updates back.
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✓ Lead synchronization</li>
                <li>✓ Task creation & updates</li>
                <li>✓ Engagement tracking</li>
                <li>✓ Custom field mapping</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">HubSpot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Keep contacts and tasks in sync with HubSpot. Track engagement and workflow interactions.
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✓ Contact synchronization</li>
                <li>✓ Task creation & updates</li>
                <li>✓ Deal tracking</li>
                <li>✓ Activity logging</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <Tabs defaultValue="config" className="w-full">
          <TabsList>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="docs">Setup Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <CRMConnectionConfig />
          </TabsContent>

          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle>Setup Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Salesforce Setup</h3>
                  <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                    <li>Create a Connected App in Salesforce</li>
                    <li>Enable OAuth for user authentication</li>
                    <li>Get your instance URL (e.g., https://yourinstance.salesforce.com)</li>
                    <li>Authorize the app from the CRM Integrations page</li>
                    <li>Configure field mappings and sync direction</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">HubSpot Setup</h3>
                  <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                    <li>Go to HubSpot Settings → Integrations → Private apps</li>
                    <li>Create a new private app with these scopes:
                      <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                        <li>crm.objects.contacts.read</li>
                        <li>crm.objects.contacts.write</li>
                        <li>crm.objects.tasks.read</li>
                        <li>crm.objects.tasks.write</li>
                      </ul>
                    </li>
                    <li>Copy the access token</li>
                    <li>Paste the token in the HubSpot configuration section</li>
                    <li>Enable the integration and configure sync settings</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> Test your connection after setup to ensure all credentials are valid.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}