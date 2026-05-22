import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';

export default function AgentPerformanceReport({ data, isLoading }) {
  useEffect(() => {
    const handleExportPDF = () => {
      if (!data) return;
      exportToPDF(data);
    };

    window.addEventListener('export-report-pdf', handleExportPDF);
    return () => window.removeEventListener('export-report-pdf', handleExportPDF);
  }, [data]);

  const exportToPDF = (reportData) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Agent Performance Report', 14, 20);
    
    let y = 30;
    doc.setFontSize(8);
    doc.text('Agent | Active | Closed | Value | Rate | Days', 14, y);
    y += 5;
    reportData.data.slice(0, 20).forEach(a => {
      doc.text(`${a.agent_email.substring(0, 15)} | ${a.active_deals} | ${a.closed_deals} | $${a.total_value} | ${a.success_rate}% | ${a.avg_days_to_close}`, 14, y);
      y += 4;
    });

    doc.save('agent_performance_report.pdf');
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_agents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_active_deals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Closed Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_closed_deals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.summary.total_pipeline_value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.data.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="agent_email" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="closed_deals" fill="#10b981" name="Closed Deals" />
              <Bar dataKey="active_deals" fill="#3b82f6" name="Active Deals" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Active Deals</TableHead>
                <TableHead className="text-right">Closed Deals</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
                <TableHead className="text-right">Avg Days to Close</TableHead>
                <TableHead className="text-right">Workload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((agent, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{agent.agent_email}</TableCell>
                  <TableCell className="text-right">{agent.active_deals}</TableCell>
                  <TableCell className="text-right">{agent.closed_deals}</TableCell>
                  <TableCell className="text-right">
                    ${agent.total_value.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{agent.success_rate}%</TableCell>
                  <TableCell className="text-right">{agent.avg_days_to_close}</TableCell>
                  <TableCell className="text-right">{agent.current_workload}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}