import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, RefreshCw, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import ReportFilters from '../components/reports/ReportFilters';
import TransactionReport from '../components/reports/TransactionReport';
import AgentPerformanceReport from '../components/reports/AgentPerformanceReport';
import PipelineReport from '../components/reports/PipelineReport';
import ForecastReport from '../components/reports/ForecastReport';

export default function Reports() {
  const [reportType, setReportType] = useState('transaction_status');
  const [filters, setFilters] = useState({});

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: markets } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['report', reportType, filters],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateReport', {
        report_type: reportType,
        filters
      });
      return response.data;
    }
  });

  const handleExport = async (format) => {
    if (!reportData) return;
    
    if (format === 'csv') {
      exportToCSV(reportData);
    } else if (format === 'pdf') {
      toast.info('Generating PDF...');
      // PDF export is handled in individual report components
      const event = new CustomEvent('export-report-pdf', { detail: reportData });
      window.dispatchEvent(event);
    }
  };

  const exportToCSV = (data) => {
    if (!data.data || data.data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data.data[0]);
    const csvContent = [
      headers.join(','),
      ...data.data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Report exported to CSV');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-600 mt-1">Generate comprehensive business insights</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => handleExport('pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <ReportFilters 
          filters={filters}
          onFiltersChange={setFilters}
          markets={markets}
          agents={agents}
          reportType={reportType}
        />

        <Tabs value={reportType} onValueChange={setReportType}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transaction_status">
              <FileText className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="agent_performance">
              <Users className="w-4 h-4 mr-2" />
              Agent Performance
            </TabsTrigger>
            <TabsTrigger value="pipeline_value">
              <DollarSign className="w-4 h-4 mr-2" />
              Pipeline Value
            </TabsTrigger>
            <TabsTrigger value="forecast">
              <Calendar className="w-4 h-4 mr-2" />
              Forecast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transaction_status" className="mt-6">
            <TransactionReport data={reportData} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="agent_performance" className="mt-6">
            <AgentPerformanceReport data={reportData} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="pipeline_value" className="mt-6">
            <PipelineReport data={reportData} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="forecast" className="mt-6">
            <ForecastReport data={reportData} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}