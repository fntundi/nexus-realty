import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

export default function ContactActivityChart({ interactions = [], filters }) {
  const data = useMemo(() => {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    
    // Create day-by-day buckets
    const dayMap = {};
    for (let i = 0; i <= Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = format(date, 'MMM dd');
      dayMap[key] = { calls: 0, emails: 0, meetings: 0, notes: 0 };
    }

    // Populate with interaction data
    interactions.forEach(interaction => {
      const intDate = new Date(interaction.interaction_date);
      if (intDate >= startDate && intDate <= endDate) {
        const key = format(intDate, 'MMM dd');
        const type = interaction.interaction_type;
        if (dayMap[key] && type in dayMap[key]) {
          dayMap[key][type]++;
        }
      }
    });

    return Object.entries(dayMap).map(([date, data]) => ({
      date,
      ...data
    }));
  }, [interactions, filters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Activity Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="emails" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="meetings" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="notes" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-8">No interaction data available</p>
        )}
      </CardContent>
    </Card>
  );
}