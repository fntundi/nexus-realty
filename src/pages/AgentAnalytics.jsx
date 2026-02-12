import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, Award, Target, Activity } from 'lucide-react';

export default function AgentAnalytics() {
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: currentAgent } = useQuery({
    queryKey: ['current-agent', user?.email],
    queryFn: () => base44.entities.Agent.filter({ user_email: user?.email }).then(a => a[0]),
    enabled: !!user && !selectedAgentId
  });

  const displayAgent = selectedAgentId 
    ? agents.find(a => a.id === selectedAgentId)
    : currentAgent;

  const canViewAllAgents = user?.role === 'admin';

  // Prepare chart data
  const propertyTypeData = displayAgent?.property_type_stats ? [
    { name: 'Single Family', total: displayAgent.property_type_stats.single_family?.total || 0, closed: displayAgent.property_type_stats.single_family?.closed || 0, rate: displayAgent.property_type_stats.single_family?.success_rate || 0 },
    { name: 'Condo', total: displayAgent.property_type_stats.condo?.total || 0, closed: displayAgent.property_type_stats.condo?.closed || 0, rate: displayAgent.property_type_stats.condo?.success_rate || 0 },
    { name: 'Townhouse', total: displayAgent.property_type_stats.townhouse?.total || 0, closed: displayAgent.property_type_stats.townhouse?.closed || 0, rate: displayAgent.property_type_stats.townhouse?.success_rate || 0 }
  ] : [];

  const priceRangeData = displayAgent?.price_range_stats ? [
    { name: 'Under $300K', total: displayAgent.price_range_stats.under_300k?.total || 0, closed: displayAgent.price_range_stats.under_300k?.closed || 0, rate: displayAgent.price_range_stats.under_300k?.success_rate || 0, avgDays: displayAgent.price_range_stats.under_300k?.avg_days_to_close || 0 },
    { name: '$300K-$500K', total: displayAgent.price_range_stats['300k_500k']?.total || 0, closed: displayAgent.price_range_stats['300k_500k']?.closed || 0, rate: displayAgent.price_range_stats['300k_500k']?.success_rate || 0, avgDays: displayAgent.price_range_stats['300k_500k']?.avg_days_to_close || 0 },
    { name: '$500K-$1M', total: displayAgent.price_range_stats['500k_1m']?.total || 0, closed: displayAgent.price_range_stats['500k_1m']?.closed || 0, rate: displayAgent.price_range_stats['500k_1m']?.success_rate || 0, avgDays: displayAgent.price_range_stats['500k_1m']?.avg_days_to_close || 0 },
    { name: 'Over $1M', total: displayAgent.price_range_stats.over_1m?.total || 0, closed: displayAgent.price_range_stats.over_1m?.closed || 0, rate: displayAgent.price_range_stats.over_1m?.success_rate || 0, avgDays: displayAgent.price_range_stats.over_1m?.avg_days_to_close || 0 }
  ] : [];

  const leadSourceData = displayAgent?.lead_source_stats ? [
    { name: 'Property Inquiry', value: displayAgent.lead_source_stats.property_inquiry?.closed || 0, total: displayAgent.lead_source_stats.property_inquiry?.total || 0, rate: displayAgent.lead_source_stats.property_inquiry?.success_rate || 0 },
    { name: 'Registration', value: displayAgent.lead_source_stats.registration?.closed || 0, total: displayAgent.lead_source_stats.registration?.total || 0, rate: displayAgent.lead_source_stats.registration?.success_rate || 0 },
    { name: 'Showing Request', value: displayAgent.lead_source_stats.showing_request?.closed || 0, total: displayAgent.lead_source_stats.showing_request?.total || 0, rate: displayAgent.lead_source_stats.showing_request?.success_rate || 0 },
    { name: 'Favorite', value: displayAgent.lead_source_stats.favorite?.closed || 0, total: displayAgent.lead_source_stats.favorite?.total || 0, rate: displayAgent.lead_source_stats.favorite?.success_rate || 0 },
    { name: 'External Import', value: displayAgent.lead_source_stats.external_import?.closed || 0, total: displayAgent.lead_source_stats.external_import?.total || 0, rate: displayAgent.lead_source_stats.external_import?.success_rate || 0 }
  ].filter(item => item.total > 0) : [];

  const monthlyData = displayAgent?.monthly_performance || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const workloadUtilization = displayAgent 
    ? ((displayAgent.current_workload || 0) / (displayAgent.max_workload || 10)) * 100 
    : 0;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Performance Analytics</h1>
            <p className="text-slate-600 mt-1">Track performance metrics and trends</p>
          </div>
          {canViewAllAgents && (
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="View all agents..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>My Performance</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.user_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {displayAgent ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Success Rate</CardTitle>
                  <Award className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(displayAgent.success_rate || 0).toFixed(1)}%</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {displayAgent.closed_deals || 0} of {displayAgent.total_assignments || 0} closed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Avg. Time to Close</CardTitle>
                  <Clock className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(displayAgent.avg_days_to_close || 0)}</div>
                  <p className="text-xs text-slate-500 mt-1">days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Active Leads</CardTitle>
                  <Activity className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayAgent.current_workload || 0}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    of {displayAgent.max_workload || 10} capacity
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Workload Utilization</CardTitle>
                  <Target className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workloadUtilization.toFixed(0)}%</div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        workloadUtilization > 80 ? 'bg-red-500' : 
                        workloadUtilization > 60 ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(workloadUtilization, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Closed</CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayAgent.closed_deals || 0}</div>
                  <p className="text-xs text-slate-500 mt-1">lifetime deals</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Performance Trend */}
            {monthlyData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rate Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="conversion_rate" stroke="#3b82f6" name="Conversion Rate %" />
                      <Line type="monotone" dataKey="deals_closed" stroke="#10b981" name="Deals Closed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Property Type Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Property Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={propertyTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#94a3b8" name="Total Leads" />
                      <Bar dataKey="closed" fill="#10b981" name="Closed" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {propertyTypeData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{item.name}</span>
                        <Badge variant={item.rate > 50 ? "default" : "outline"}>
                          {item.rate.toFixed(0)}% success
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Price Range Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Price Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={priceRangeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="rate" fill="#3b82f6" name="Success Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {priceRangeData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{item.name}</span>
                        <div className="flex gap-3">
                          <span className="text-slate-500">{item.avgDays}d avg</span>
                          <Badge>{item.closed}/{item.total}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Lead Source Effectiveness */}
              {leadSourceData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Source Effectiveness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={leadSourceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {leadSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {leadSourceData.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="text-slate-600">{item.name}</span>
                          </div>
                          <Badge>{item.rate.toFixed(0)}% ({item.value}/{item.total})</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Average Days to Close by Property Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Average Days to Close</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">Overall Average</span>
                      <Badge className="bg-blue-600">
                        {Math.round(displayAgent.avg_days_to_close || 0)} days
                      </Badge>
                    </div>
                    {priceRangeData.map((item, idx) => (
                      item.avgDays > 0 && (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">{item.name}</span>
                          <span className="text-sm font-medium">{item.avgDays} days</span>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              No agent profile found. Please contact your administrator.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}