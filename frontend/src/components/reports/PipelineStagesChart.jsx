import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

export default function PipelineStagesChart({ transactions = [] }) {
  const data = useMemo(() => {
    const stages = {
      pre_qual: { count: 0, color: '#3b82f6' },
      showing: { count: 0, color: '#8b5cf6' },
      offer: { count: 0, color: '#f59e0b' },
      under_contract: { count: 0, color: '#10b981' },
      closing: { count: 0, color: '#ef4444' }
    };

    transactions.forEach(txn => {
      if (txn.status === 'active' && stages[txn.stage]) {
        stages[txn.stage].count++;
      }
    });

    return Object.entries(stages)
      .filter(([_, data]) => data.count > 0)
      .map(([stage, data]) => ({
        name: stage.replace(/_/g, ' ').toUpperCase(),
        value: data.count,
        color: data.color
      }));
  }, [transactions]);

  const stageLabels = {
    'PRE_QUAL': 'Pre-Qualification',
    'SHOWING': 'Showing',
    'OFFER': 'Offer',
    'UNDER_CONTRACT': 'Under Contract',
    'CLOSING': 'Closing'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Pipeline Stages</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-8">No active transactions</p>
        )}
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {data.map(item => (
              <div key={item.name} className="p-2 text-center bg-slate-50 rounded-lg">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: item.color }}
                ></div>
                <p className="text-xs font-semibold text-slate-900">{item.value}</p>
                <p className="text-xs text-slate-600">{item.name}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}