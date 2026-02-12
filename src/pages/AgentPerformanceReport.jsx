import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, DollarSign, Star, CheckCircle, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';
import AgentPerformanceCharts from '../components/reports/AgentPerformanceCharts';
import AgentPerformanceTable from '../components/reports/AgentPerformanceTable';

export default function AgentPerformanceReport() {
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date')
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date')
  });

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => base44.entities.AgentFeedback.list('-feedback_date')
  });

  const isLoading = agentsLoading || transactionsLoading || leadsLoading || feedbackLoading;

  const daysBack = parseInt(dateRange);
  const startDate = subDays(new Date(), daysBack);

  // Filter data by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => new Date(t.created_date) >= startDate);
  }, [transactions, startDate]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => new Date(l.created_date) >= startDate);
  }, [leads, startDate]);

  const filteredFeedback = useMemo(() => {
    return feedback.filter(f => new Date(f.feedback_date) >= startDate);
  }, [feedback, startDate]);

  // Calculate performance metrics for each agent
  const agentMetrics = useMemo(() => {
    return agents
      .filter(agent => {
        const matchesAgent = selectedAgent === 'all' || agent.id === selectedAgent;
        const matchesSearch = !searchTerm || 
          agent.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.market_id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesAgent && matchesSearch;
      })
      .map(agent => {
        // Leads assigned in date range
        const agentLeads = filteredLeads.filter(l => l.assigned_agent_id === agent.id);
        const totalLeadsAssigned = agentLeads.length;

        // Transactions (closed deals)
        const agentTransactions = filteredTransactions.filter(t => t.agent_id === agent.id);
        const closedDeals = agentTransactions.filter(t => t.status === 'closed_won').length;
        const activeDeals = agentTransactions.filter(t => t.status === 'active').length;

        // Conversion rate
        const conversionRate = totalLeadsAssigned > 0 
          ? ((closedDeals / totalLeadsAssigned) * 100).toFixed(1)
          : 0;

        // Average deal value
        const closedTransactions = agentTransactions.filter(t => t.status === 'closed_won');
        const avgDealValue = closedTransactions.length > 0
          ? closedTransactions.reduce((sum, t) => sum + (t.contract_price || 0), 0) / closedTransactions.length
          : 0;

        // Client feedback
        const agentFeedback = filteredFeedback.filter(f => f.agent_id === agent.id);
        const avgRating = agentFeedback.length > 0
          ? (agentFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / agentFeedback.length).toFixed(1)
          : null;
        const recommendationRate = agentFeedback.length > 0
          ? ((agentFeedback.filter(f => f.would_recommend).length / agentFeedback.length) * 100).toFixed(0)
          : null;

        return {
          ...agent,
          totalLeadsAssigned,
          closedDeals,
          activeDeals,
          conversionRate: parseFloat(conversionRate),
          avgDealValue,
          avgRating: avgRating ? parseFloat(avgRating) : null,
          recommendationRate: recommendationRate ? parseFloat(recommendationRate) : null,
          totalFeedback: agentFeedback.length
        };
      })
      .sort((a, b) => b.closedDeals - a.closedDeals);
  }, [agents, filteredLeads, filteredTransactions, filteredFeedback, selectedAgent, searchTerm]);

  const topPerformers = agentMetrics.slice(0, 3);
  const overallMetrics = useMemo(() => {
    return {
      totalAgents: agentMetrics.length,
      totalLeadsAssigned: agentMetrics.reduce((sum, a) => sum + a.totalLeadsAssigned, 0),
      totalDealsClosedCount: agentMetrics.reduce((sum, a) => sum + a.closedDeals, 0),
      avgConversionRate: agentMetrics.length > 0
        ? (agentMetrics.reduce((sum, a) => sum + a.conversionRate, 0) / agentMetrics.length).toFixed(1)
        : 0,
      totalPipelineValue: agentMetrics.reduce((sum, a) => sum + (a.avgDealValue * a.activeDeals), 0)
    };
  }, [agentMetrics]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Agent Performance Dashboard</h1>
            <p className="text-slate-600 mt-1">Track agent metrics and identify top performers</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {agentMetrics.length} Active Agents
          </Badge>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date-range" className="text-sm mb-2 block">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agent-filter" className="text-sm mb-2 block">Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger id="agent-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search" className="text-sm mb-2 block">Search</Label>
              <Input
                id="search"
                placeholder="Search agent email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4" />
                Active Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{overallMetrics.totalAgents}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
                <TrendingUp className="w-4 h-4" />
                Leads Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{overallMetrics.totalLeadsAssigned}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
                <CheckCircle className="w-4 h-4" />
                Deals Closed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{overallMetrics.totalDealsClosedCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
                <TrendingUp className="w-4 h-4" />
                Avg Conv. Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{overallMetrics.avgConversionRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
                <DollarSign className="w-4 h-4" />
                Pipeline Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                ${(overallMetrics.totalPipelineValue / 1000000).toFixed(1)}M
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPerformers.map((agent, index) => (
                  <div key={agent.id} className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-slate-600">#{index + 1}</p>
                        <p className="font-semibold text-slate-900 text-sm">{agent.user_email.split('@')[0]}</p>
                      </div>
                      {agent.avgRating && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                          {agent.avgRating}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Closed:</span>
                        <span className="font-semibold text-slate-900">{agent.closedDeals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Conv. Rate:</span>
                        <span className="font-semibold text-slate-900">{agent.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Avg Deal:</span>
                        <span className="font-semibold text-slate-900">
                          ${(agent.avgDealValue / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <AgentPerformanceCharts agentMetrics={agentMetrics} />

        {/* Detailed Table */}
        <AgentPerformanceTable agentMetrics={agentMetrics} />
      </div>
    </div>
  );
}