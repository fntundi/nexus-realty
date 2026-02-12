import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';

export default function AgentPerformanceCharts({ agentMetrics }) {
  // Prepare data for charts
  const chartData = agentMetrics.map(agent => ({
    name: agent.user_email.split('@')[0],
    closedDeals: agent.closedDeals,
    conversionRate: agent.conversionRate,
    avgDealValue: agent.avgDealValue / 1000000, // Convert to millions
    avgRating: agent.avgRating || 0,
    leadsAssigned: agent.totalLeadsAssigned
  }));

  // Top 10 agents for detailed view
  const topAgentsData = chartData.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Closed Deals vs Leads Assigned */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Closed Deals vs Leads Assigned</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={topAgentsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="closedDeals" fill="#10b981" name="Closed Deals" />
              <Line yAxisId="right" type="monotone" dataKey="leadsAssigned" stroke="#f59e0b" name="Leads Assigned" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topAgentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Bar dataKey="conversionRate" fill="#3b82f6" name="Conversion Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deal Value vs Rating */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deal Value vs Client Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="avgDealValue" name="Avg Deal Value (M)" />
                <YAxis dataKey="avgRating" name="Client Rating" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Agents" data={topAgentsData} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Client Ratings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Satisfaction Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.filter(a => a.avgRating > 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip formatter={(value) => value.toFixed(1)} />
              <Bar dataKey="avgRating" fill="#ec4899" name="Avg Rating (out of 5)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}