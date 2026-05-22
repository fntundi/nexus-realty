import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import EmailTemplateForm from '../components/email/EmailTemplateForm';
import EmailSequenceForm from '../components/email/EmailSequenceForm';
import CampaignAnalytics from '../components/email/CampaignAnalytics';
import AdvancedCampaignAnalytics from '../components/email/AdvancedCampaignAnalytics';
import ScheduleEmailSequenceDialog from '../components/email/ScheduleEmailSequenceDialog';
import ABTestingSetup from '../components/email/ABTestingSetup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';

export default function EmailAutomation() {
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showSequenceForm, setShowSequenceForm] = useState(false);
  const [selectedSequenceForSchedule, setSelectedSequenceForSchedule] = useState(null);
  const [selectedSequenceForAB, setSelectedSequenceForAB] = useState(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list('-created_date', 50)
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ['emailSequences'],
    queryFn: () => base44.entities.EmailSequence.list('-created_date', 50)
  });

  const handleExecuteTriggers = async () => {
    await base44.functions.invoke('executeEmailTriggers', {});
    alert('Email triggers executed!');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Email Automation</h1>
          <Button onClick={handleExecuteTriggers} className="bg-purple-600 hover:bg-purple-700">
            <Zap className="w-4 h-4 mr-2" />
            Execute Triggers Now
          </Button>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
            <TabsTrigger value="sequences">Email Sequences</TabsTrigger>
            <TabsTrigger value="analytics">Campaign Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Email Templates</h2>
              <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Email Template</DialogTitle>
                  </DialogHeader>
                  <EmailTemplateForm onSuccess={() => setShowTemplateForm(false)} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600">Subject:</p>
                      <p className="text-slate-900 font-mono text-sm">{template.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Variables:</p>
                      <div className="flex flex-wrap gap-2">
                        {template.variables?.map(v => (
                          <Badge key={v} variant="outline" className="font-mono text-xs">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sequences" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Email Sequences</h2>
              <Dialog open={showSequenceForm} onOpenChange={setShowSequenceForm}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Sequence
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Email Sequence</DialogTitle>
                  </DialogHeader>
                  <EmailSequenceForm onSuccess={() => setShowSequenceForm(false)} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sequences.map(sequence => (
                <Card key={sequence.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{sequence.name}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">{sequence.description}</p>
                      </div>
                      <Badge variant={sequence.is_active ? 'default' : 'secondary'}>
                        {sequence.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600">Trigger Type:</p>
                      <p className="text-slate-900 font-semibold">{sequence.trigger_type.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Trigger Value:</p>
                      <p className="text-slate-900">{sequence.trigger_value}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Emails in Sequence:</p>
                      <p className="text-slate-900 font-semibold">{sequence.emails.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Times Executed:</p>
                      <p className="text-slate-900 font-semibold">{sequence.execution_count || 0}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedSequenceForSchedule(sequence.id)}>
                            Schedule
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Schedule: {sequence.name}</DialogTitle>
                          </DialogHeader>
                          <ScheduleEmailSequenceDialog
                            sequenceId={sequence.id}
                            onSuccess={() => setSelectedSequenceForSchedule(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedSequenceForAB(sequence.id)}>
                            A/B Test
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>A/B Test: {sequence.name}</DialogTitle>
                          </DialogHeader>
                          <ABTestingSetup
                            sequenceId={sequence.id}
                            onSuccess={() => setSelectedSequenceForAB(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AdvancedCampaignAnalytics />
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex gap-4">
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <a href={createPageUrl('ContactSegments')}>
              Manage Contact Segments
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}