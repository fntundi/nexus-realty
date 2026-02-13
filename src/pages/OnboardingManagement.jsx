import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import OnboardingWorkflowBuilder from '../components/onboarding/OnboardingWorkflowBuilder';

export default function OnboardingManagement() {
  const [startOnboardingOpen, setStartOnboardingOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date', 100)
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => base44.entities.OnboardingWorkflow.filter({ is_active: true })
  });

  const { data: activeOnboarding = [] } = useQuery({
    queryKey: ['active-onboarding'],
    queryFn: () => base44.entities.OnboardingProgress.filter({ status: 'in_progress' })
  });

  const handleStartOnboarding = async () => {
    if (!selectedContact || !selectedWorkflow) {
      toast.error('Please select both contact and workflow');
      return;
    }

    try {
      const result = await base44.functions.invoke('triggerClientOnboarding', {
        contact_id: selectedContact,
        workflow_id: selectedWorkflow,
        agent_email: user.email
      });

      if (result.data.success) {
        toast.success('Onboarding started successfully!');
        setStartOnboardingOpen(false);
        setSelectedContact('');
        setSelectedWorkflow('');
      }
    } catch (error) {
      toast.error('Failed to start onboarding');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Client Onboarding</h1>
            <p className="text-slate-600 mt-1">Manage workflows and track client progress</p>
          </div>
          <Button onClick={() => setStartOnboardingOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Start New Onboarding
          </Button>
        </div>

        <Tabs defaultValue="workflows">
          <TabsList>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="active">Active Onboarding ({activeOnboarding.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <OnboardingWorkflowBuilder />
          </TabsContent>

          <TabsContent value="active">
            <div className="grid gap-4">
              {activeOnboarding.map(progress => {
                const contact = contacts.find(c => c.id === progress.contact_id);
                return (
                  <Card key={progress.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {contact?.first_name} {contact?.last_name}
                          </div>
                          <div className="text-sm text-slate-600">{contact?.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900">
                            {progress.completion_percentage}%
                          </div>
                          <div className="text-sm text-slate-600">Complete</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {activeOnboarding.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-slate-500">
                    No active onboarding processes
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={startOnboardingOpen} onOpenChange={setStartOnboardingOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Client Onboarding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Contact</Label>
                <Select value={selectedContact} onValueChange={setSelectedContact}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name} ({contact.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Select Workflow</Label>
                <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a workflow..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map(workflow => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name} ({workflow.client_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                onClick={handleStartOnboarding}
                disabled={!selectedContact || !selectedWorkflow}
              >
                Start Onboarding
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}