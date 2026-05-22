import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';
import { BarChart3, TrendingUp, Clock } from 'lucide-react';

export default function LenderAnalytics({ transactions = [], documents = [] }) {
  // Calculate document processing times by type
  const getDocProcessingTimes = () => {
    const docTypes = {};
    
    documents.forEach(doc => {
      const type = doc.category || 'other';
      if (!docTypes[type]) {
        docTypes[type] = {
          name: type.replace(/_/g, ' '),
          times: [],
          approved: 0,
          total: 0
        };
      }
      
      docTypes[type].total += 1;
      if (doc.status === 'approved') {
        docTypes[type].approved += 1;
      }
      
      if (doc.created_date && doc.updated_date) {
        const processingTime = differenceInDays(
          parseISO(doc.updated_date),
          parseISO(doc.created_date)
        );
        if (processingTime >= 0) {
          docTypes[type].times.push(processingTime);
        }
      }
    });

    return Object.entries(docTypes).map(([key, data]) => ({
      name: data.name,
      avgTime: data.times.length > 0 
        ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length) 
        : 0,
      minTime: data.times.length > 0 ? Math.min(...data.times) : 0,
      maxTime: data.times.length > 0 ? Math.max(...data.times) : 0,
      totalDocs: data.total,
      approvedRate: Math.round((data.approved / data.total) * 100)
    }));
  };

  // Calculate lender performance metrics
  const getLenderPerformance = () => {
    const approved = transactions.filter(t => t.status === 'closed').length;
    const rejected = transactions.filter(t => t.status === 'rejected').length;
    const pending = transactions.filter(t => 
      t.status !== 'closed' && t.status !== 'rejected'
    ).length;
    const total = transactions.length;

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
    const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0;

    // Calculate average loan amount
    const avgLoanAmount = total > 0
      ? Math.round(transactions.reduce((sum, t) => sum + (t.loan_amount || 0), 0) / total)
      : 0;

    // Processing time trends (by month)
    const processingByMonth = {};
    transactions.forEach(t => {
      if (t.created_date && t.closed_date && t.status === 'closed') {
        const date = new Date(t.created_date);
        const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!processingByMonth[month]) {
          processingByMonth[month] = {
            name: month,
            days: [],
            count: 0
          };
        }

        const days = differenceInDays(parseISO(t.closed_date), parseISO(t.created_date));
        processingByMonth[month].days.push(days);
        processingByMonth[month].count += 1;
      }
    });

    const processingTrends = Object.entries(processingByMonth)
      .map(([month, data]) => ({
        month: month,
        avgDays: Math.round(data.days.reduce((a, b) => a + b, 0) / data.days.length),
        loansProcessed: data.count
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .slice(-6); // Last 6 months

    return {
      approvalRate,
      rejectionRate,
      pendingRate,
      approved,
      rejected,
      pending,
      avgLoanAmount,
      processingTrends
    };
  };

  // Get loan status breakdown
  const getLoanStatusBreakdown = () => {
    const statuses = {};
    
    transactions.forEach(t => {
      const status = t.current_stage || t.status || 'unknown';
      if (!statuses[status]) {
        statuses[status] = {
          name: status.replace(/_/g, ' '),
          value: 0,
          count: 0,
          total: 0
        };
      }
      statuses[status].count += 1;
      statuses[status].total += t.loan_amount || 0;
    });

    const total = transactions.length;
    return Object.entries(statuses).map(([key, data]) => ({
      name: data.name,
      value: Math.round((data.count / total) * 100),
      count: data.count,
      total: data.total
    })).sort((a, b) => b.value - a.value);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  
  const docProcessingData = getDocProcessingTimes();
  const performanceData = getLenderPerformance();
  const statusData = getLoanStatusBreakdown();

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{performanceData.approvalRate}%</div>
            <p className="text-xs text-slate-500 mt-1">{performanceData.approved} approved loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{transactions.length}</div>
            <p className="text-xs text-slate-500 mt-1">${(performanceData.avgLoanAmount / 1000).toFixed(0)}K avg loan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {performanceData.processingTrends.length > 0
                ? Math.round(
                    performanceData.processingTrends.reduce((sum, t) => sum + t.avgDays, 0) /
                    performanceData.processingTrends.length
                  )
                : 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">days to close</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{performanceData.pending}</div>
            <p className="text-xs text-slate-500 mt-1">{performanceData.pendingRate}% of portfolio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Processing Times by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Document Processing Times by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {docProcessingData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No documents to analyze</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={docProcessingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => `${value} days`}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  <Bar dataKey="avgTime" fill="#3b82f6" name="Avg Time" />
                  <Bar dataKey="maxTime" fill="#ef4444" name="Max Time" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {docProcessingData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-2">
                {docProcessingData.map((doc, idx) => (
                  <div key={idx} className="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-900">{doc.name}</span>
                      <Badge className="bg-blue-100 text-blue-800">{doc.approvedRate}% approved</Badge>
                    </div>
                    <div className="text-slate-600 mt-1">
                      {doc.totalDocs} docs • {doc.avgTime}d avg • {doc.minTime}d-{doc.maxTime}d range
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loan Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Loan Application Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {statusData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No loans to analyze</p>
            ) : (
              <div className="space-y-3">
                {statusData.map((status, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{status.name}</span>
                      <span className="text-sm font-bold text-slate-900">{status.value}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${status.value}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {status.count} loans • ${(status.total / 1000000).toFixed(1)}M value
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processing Time Trend */}
      {performanceData.processingTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Loan Processing Time Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData.processingTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value) => `${value} days`}
                  labelFormatter={(label) => label}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgDays"
                  stroke="#9333ea"
                  name="Avg Processing Days"
                  dot={{ fill: '#9333ea', r: 5 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Approval Rates Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-slate-600 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{performanceData.approved}</p>
              <p className="text-xs text-slate-500 mt-2">{performanceData.approvalRate}% success rate</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-slate-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{performanceData.pending}</p>
              <p className="text-xs text-slate-500 mt-2">{performanceData.pendingRate}% of portfolio</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-slate-600 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{performanceData.rejected}</p>
              <p className="text-xs text-slate-500 mt-2">{performanceData.rejectionRate}% rejection rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}