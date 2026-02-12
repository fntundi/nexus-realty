import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function ForecastReport({ data, isLoading }) {
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
    doc.text('Closing Forecast Report', 14, 20);
    
    let y = 30;
    doc.setFontSize(8);
    doc.text('Property | Agent | Stage | Value | Closing | Prob', 14, y);
    y += 5;
    reportData.data.slice(0, 20).forEach(t => {
      doc.text(`${t.property.substring(0, 12)} | ${t.agent.substring(0, 10)} | ${t.stage} | $${t.value} | ${format(new Date(t.closing_date), 'MMM d')} | ${(t.probability * 100).toFixed(0)}%`, 14, y);
      y += 4;
    });

    doc.save('forecast_report.pdf');
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!data) return null;

  const chartData = [
    { period: '30 Days', count: data.summary.next_30_days.count, value: data.summary.next_30_days.value },
    { period: '60 Days', count: data.summary.next_60_days.count, value: data.summary.next_60_days.value },
    { period: '90 Days', count: data.summary.next_90_days.count, value: data.summary.next_90_days.value }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Next 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.next_30_days.count}</div>
            <p className="text-sm text-slate-600 mt-1">
              ${data.summary.next_30_days.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              Next 60 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.next_60_days.count}</div>
            <p className="text-sm text-slate-600 mt-1">
              ${data.summary.next_60_days.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              Next 90 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.next_90_days.count}</div>
            <p className="text-sm text-slate-600 mt-1">
              ${data.summary.next_90_days.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Deal Count"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                name="Total Value ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected Closings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Closing Date</TableHead>
                <TableHead className="text-right">Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((deal, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{deal.property}</TableCell>
                  <TableCell>{deal.agent}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {deal.stage.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${deal.value.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {format(new Date(deal.closing_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={
                      deal.probability >= 0.7 ? 'bg-green-100 text-green-800' :
                      deal.probability >= 0.4 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {(deal.probability * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}