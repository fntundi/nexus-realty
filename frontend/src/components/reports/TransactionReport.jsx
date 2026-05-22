import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

export default function TransactionReport({ data, isLoading }) {
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
    doc.text('Transaction Status Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 28);

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Transactions: ${reportData.summary.total}`, 14, 48);
    doc.text(`Total Value: $${reportData.summary.total_value.toLocaleString()}`, 14, 55);

    // Simple text-based table
    let y = 70;
    doc.setFontSize(8);
    doc.text('Property | Agent | Stage | Status | Value', 14, y);
    y += 5;
    reportData.data.slice(0, 20).forEach(t => {
      doc.text(`${t.property.substring(0, 15)} | ${t.agent.substring(0, 10)} | ${t.stage} | ${t.status} | $${t.contract_price || 0}`, 14, y);
      y += 4;
    });

    doc.save('transaction_report.pdf');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const stageBadgeColors = {
    pre_qual: 'bg-yellow-100 text-yellow-800',
    showing: 'bg-blue-100 text-blue-800',
    offer: 'bg-purple-100 text-purple-800',
    under_contract: 'bg-orange-100 text-orange-800',
    closing: 'bg-green-100 text-green-800'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.summary.total_value.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Transaction Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.summary.total > 0 
                ? Math.round(data.summary.total_value / data.summary.total).toLocaleString() 
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.summary.by_stage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.property}</TableCell>
                  <TableCell>{transaction.agent}</TableCell>
                  <TableCell>{transaction.buyer}</TableCell>
                  <TableCell>
                    <Badge className={stageBadgeColors[transaction.stage]}>
                      {transaction.stage.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.contract_price 
                      ? `$${transaction.contract_price.toLocaleString()}` 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(transaction.created_date), 'MMM d, yyyy')}
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