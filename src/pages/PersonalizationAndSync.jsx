import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DynamicContentBuilder from '@/components/personalization/DynamicContentBuilder';
import LeadScoringModelBuilder from '@/components/scoring/LeadScoringModelBuilder';
import CRMSyncRuleBuilder from '@/components/sync/CRMSyncRuleBuilder';
import { Zap, Target, RefreshCw } from 'lucide-react';

export default function PersonalizationAndSync() {
  const [contentState, setContentState] = React.useState('');

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Personalization & CRM Sync
          </h1>
          <p className="text-slate-600">
            Configure dynamic content, custom scoring models, and automated CRM synchronization
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personalization" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personalization" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Dynamic Content
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Scoring Models
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              CRM Sync Rules
            </TabsTrigger>
          </TabsList>

          {/* Dynamic Content Tab */}
          <TabsContent value="personalization" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              <DynamicContentBuilder 
                content={contentState}
                onContentChange={setContentState}
              />
            </div>
          </TabsContent>

          {/* Scoring Models Tab */}
          <TabsContent value="scoring" className="space-y-4">
            <LeadScoringModelBuilder />
          </TabsContent>

          {/* CRM Sync Tab */}
          <TabsContent value="sync" className="space-y-4">
            <CRMSyncRuleBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}