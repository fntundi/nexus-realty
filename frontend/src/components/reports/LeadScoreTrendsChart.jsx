import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function LeadScoreTrendsChart({ contacts = [], filters }) {
  const data = useMemo(() => {
    // Get score distribution and trends
    const scoreRanges = {
      '0-20': { count: 0, avg: 0 },
      '21-40': { count: 0, avg: 0 },
      '41-60': { count: 0, avg: 0 },
      '61-80': { count: 0, avg: 0 },
      '81-100': { count: 0, avg: 0 }
    };

    contacts.forEach(contact => {
      if (filters.selectedContactType && contact.contact_type !== filters.selectedContactType) return;
      if (filters.selectedAgent && contact.assigned_agent_email !== filters.selectedAgent) return;

      const score = contact.lead_score || 0;
      if (score <= 20) scoreRanges['0-20'].count++;
      else if (score <= 40) scoreRanges['21-40'].count++;
      else if (score <= 60) scoreRanges['41-60'].count++;
      else if (score <= 80) scoreRanges['61-80'].count++;
      else scoreRanges['81-100'].count++;
    });

    return Object.entries(scoreRanges).map(([range, data]) => ({
      range,
      contacts: data.count
    }));
  }, [contacts, filters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Score Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {data.some(d => d.contacts > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="contacts" fill="#3b82f6" stroke="#1e40af" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-8">No score data available</p>
        )}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-slate-700">
            <strong>Score Breakdown:</strong> High-scoring leads (81-100) indicate prospects with strong engagement and demographic fit, ready for immediate follow-up.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}