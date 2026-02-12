import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function LeadConversionChart({ contacts = [], filters }) {
  const data = useMemo(() => {
    // Group contacts by status and calculate conversion rates
    const statusGroups = {};
    let totalContacts = 0;

    contacts.forEach(contact => {
      if (filters.selectedContactType && contact.contact_type !== filters.selectedContactType) return;
      
      const status = contact.status || 'unknown';
      if (!statusGroups[status]) {
        statusGroups[status] = { count: 0, avgScore: 0 };
      }
      statusGroups[status].count++;
      statusGroups[status].avgScore += contact.lead_score || 0;
      totalContacts++;
    });

    return Object.entries(statusGroups).map(([status, data]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      count: data.count,
      percentage: totalContacts > 0 ? ((data.count / totalContacts) * 100).toFixed(1) : 0,
      avgScore: (data.avgScore / data.count).toFixed(1)
    }));
  }, [contacts, filters]);

  const colors = {
    'Active': '#10b981',
    'Prospect': '#3b82f6',
    'Inactive': '#6b7280'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Conversion Rates</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Lead Score', angle: 90, position: 'insideRight' }} />
              <Tooltip formatter={(value, name) => {
                if (name === 'count') return value;
                return parseFloat(value).toFixed(1);
              }} />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Contact Count" />
              <Bar yAxisId="right" dataKey="avgScore" fill="#10b981" name="Avg Lead Score" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-8">No data available for selected filters</p>
        )}
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            {data.map(item => (
              <div key={item.name} className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">{item.name}</p>
                <p className="text-xl font-bold text-slate-900">{item.percentage}%</p>
                <p className="text-xs text-slate-500">({item.count} contacts)</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}