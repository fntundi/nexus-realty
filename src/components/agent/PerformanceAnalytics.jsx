import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target, Clock, Award } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { differenceInDays } from 'date-fns';

export default function PerformanceAnalytics({ agentEmail }) {
  const { data: agent } = useQuery({
    queryKey: ['agent-profile', agentEmail],
    queryFn: async () => {
      const agents = await base44.entities.Agent.filter({ user_email: agentEmail });
      return agents[0];
    },
    enabled: !!agentEmail
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['agent-leads', agentEmail],
    queryFn: () => base44.entities.Lead.filter({ assigned_agent_id: agent?.id }),
    enabled: !!agent
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['agent-transactions', agentEmail],
    queryFn: () => base44.entities.Transaction.filter({ agent_id: agent?.id }, '-created_date'),
    enabled: !!agent
  });

  if (!agent) return <div>Loading...</div>;

  // Calculate metrics
  const totalLeads = leads.length;
  const closedLeads = leads.filter(l => l.status === 'closed_won').length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : 0;

  const closedTransactions = transactions.filter(t => t.status === 'closed_won');
  const totalRevenue = closedTransactions.reduce((sum, t) => sum + (t.contract_price || 0), 0);
  
  // Calculate average deal cycle time
  const dealCycleTimes = closedTransactions
    .filter(t => t.closing_date && t.created_date)
    .map(t => differenceInDays(new Date(t.closing_date), new Date(t.created_date)));
  const avgDealCycle = dealCycleTimes.length > 0 
    ? Math.round(dealCycleTimes.reduce((a, b) => a + b, 0) / dealCycleTimes.length)
    : 0;

  // Monthly performance data
  const monthlyData = agent.monthly_performance || [];

  // Lead source breakdown
  const leadSourceData = Object.entries(agent.lead_source_stats || {}).map(([source, stats]) => ({
    name: source.replace(/_/g, ' '),
    total: stats.total || 0,
    closed: stats.closed || 0,
    rate: stats.success_rate || 0
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{conversionRate}%</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              {conversionRate > 30 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className="text-slate-600">{closedLeads}/{totalLeads} closed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              ${(totalRevenue / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {closedTransactions.length} closed deals
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Deal Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{avgDealCycle}</div>
            <div className="text-sm text-slate-600 mt-1">days to close</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Success Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {(agent.success_rate || 0).toFixed(0)}%
            </div>
            <div className="text-sm text-slate-600 mt-1">overall performance</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="leads_assigned" stroke="#3b82f6" name="Leads" />
                <Line type="monotone" dataKey="deals_closed" stroke="#10b981" name="Closed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Lead Source Performance */}
      {leadSourceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Source Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadSourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" name="Total Leads" />
                <Bar dataKey="closed" fill="#10b981" name="Closed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Property Type Performance */}
      {agent.property_type_stats && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Property Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(agent.property_type_stats).map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-semibold capitalize">{type.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-slate-600">
                      {stats.closed}/{stats.total} closed • {stats.avg_days_to_close} days avg
                    </div>
                  </div>
                  <Badge className={stats.success_rate > 50 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                    {stats.success_rate.toFixed(0)}% success rate
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}