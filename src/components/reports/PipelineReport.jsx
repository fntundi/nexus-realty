import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PipelineReport({ data, isLoading }) {
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
    let yPos = 20;
    
    doc.setFontSize(18);
    doc.text('Pipeline Value Report', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, yPos);
    yPos += 12;

    const colWidths = [50, 35, 20, 30, 30, 20];
    const startX = 14;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    let x = startX;
    ['Property', 'Agent', 'Stage', 'Value', 'Weighted', 'Prob'].forEach((header, i) => {
      doc.text(header, x, yPos);
      x += colWidths[i];
    });
    yPos += 8;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    
    reportData.data.slice(0, 20).forEach(t => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      x = startX;
      doc.text(t.property.substring(0, 20), x, yPos);
      x += colWidths[0];
      doc.text(t.agent.substring(0, 15), x, yPos);
      x += colWidths[1];
      doc.text(t.stage.substring(0, 10), x, yPos);
      x += colWidths[2];
      doc.text(`$${(t.value / 1000).toFixed(0)}K`, x, yPos);
      x += colWidths[3];
      doc.text(`$${(t.weighted_value / 1000).toFixed(0)}K`, x, yPos);
      x += colWidths[4];
      doc.text(`${(t.probability * 100).toFixed(0)}%`, x, yPos);
      yPos += 6;
    });

    doc.save('pipeline_report.pdf');
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.summary.total_value.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data.summary.total_deals} active deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(data.summary.weighted_value).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Based on close probability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(data.summary.total_value / data.summary.total_deals).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.summary.by_stage}
                  dataKey="value"
                  nameKey="stage"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `$${(entry.value / 1000).toFixed(0)}K`}
                >
                  {data.summary.by_stage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {data.summary.by_stage.map((stage, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium capitalize">
                      {stage.stage.replace(/_/g, ' ')}
                    </span>
                    <Badge>{stage.count} deals</Badge>
                  </div>
                  <div className="text-sm text-slate-600">
                    Total: ${stage.value.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600">
                    Weighted: ${Math.round(stage.weighted_value).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deal Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Probability</TableHead>
                <TableHead className="text-right">Weighted Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((deal, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{deal.property}</TableCell>
                  <TableCell>{deal.agent}</TableCell>
                  <TableCell>{deal.market}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {deal.stage.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${deal.value.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(deal.probability * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Math.round(deal.weighted_value).toLocaleString()}
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