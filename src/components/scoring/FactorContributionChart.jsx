import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FactorContributionChart({ factors }) {
  if (!factors || factors.length === 0) {
    return null;
  }

  const data = factors.map(factor => ({
    name: factor.factor_name?.substring(0, 15),
    weight: factor.weight || 1,
    points: factor.points || 0,
    contribution: (factor.weight || 1) * (factor.points || 0) / 10
  }));

  const totalContribution = data.reduce((sum, d) => sum + d.contribution, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Factor Contribution Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="contribution" fill="#3b82f6" name="Contribution to Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-slate-600">Total Factors</p>
            <p className="text-lg font-semibold">{factors.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Max Possible Score</p>
            <p className="text-lg font-semibold">{Math.round(totalContribution)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}