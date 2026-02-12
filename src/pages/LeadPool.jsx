import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Search, Filter, UserPlus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadPool() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');

  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date')
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const assignLeadMutation = useMutation({
    mutationFn: async ({ leadId, agentId }) => {
      const agent = agents.find(a => a.id === agentId);
      await base44.entities.Lead.update(leadId, {
        assigned_agent_id: agentId,
        status: 'assigned',
        assigned_date: new Date().toISOString(),
        assignment_method: 'manual_builder'
      });
      
      // Update agent workload
      if (agent) {
        await base44.entities.Agent.update(agentId, {
          current_workload: (agent.current_workload || 0) + 1,
          total_assignments: (agent.total_assignments || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setAssignDialogOpen(false);
      setSelectedLead(null);
      setSelectedAgent('');
      toast.success('Lead assigned successfully');
    }
  });

  const handleAssign = () => {
    if (selectedLead && selectedAgent) {
      assignLeadMutation.mutate({ 
        leadId: selectedLead.id, 
        agentId: selectedAgent 
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.buyer_email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getMarketName = (marketId) => {
    const market = markets.find(m => m.id === marketId);
    return market ? market.name : 'Unknown';
  };

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.user_email : 'Unassigned';
  };

  const getStatusBadge = (status) => {
    const variants = {
      unassigned: 'destructive',
      assigned: 'default',
      contacted: 'default',
      qualified: 'default',
      active: 'default'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Lead Pool</h1>
            <p className="text-slate-600 mt-1">Manage and assign leads to agents</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Leads ({filteredLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No leads found</div>
            ) : (
              <div className="space-y-3">
                {filteredLeads.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{lead.buyer_name}</div>
                        <div className="text-sm text-slate-600">{lead.buyer_email}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Market</div>
                        <div className="text-sm font-medium text-slate-900">{getMarketName(lead.market_id)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Source</div>
                        <div className="text-sm font-medium text-slate-900">{lead.source.replace(/_/g, ' ')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Status</div>
                        {getStatusBadge(lead.status)}
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Assigned To</div>
                        <div className="text-sm font-medium text-slate-900">
                          {lead.assigned_agent_id ? getAgentName(lead.assigned_agent_id) : 'None'}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedLead(lead);
                        setAssignDialogOpen(true);
                      }}
                    >
                      {lead.status === 'unassigned' ? (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Assign
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Reassign
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Lead to Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedLead && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-900">{selectedLead.buyer_name}</div>
                  <div className="text-sm text-slate-600">{selectedLead.buyer_email}</div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.filter(a => a.status === 'active').map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.user_email} - Workload: {agent.current_workload}/{agent.max_workload}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssign}
                  disabled={!selectedAgent || assignLeadMutation.isPending}
                >
                  {assignLeadMutation.isPending ? 'Assigning...' : 'Assign Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}