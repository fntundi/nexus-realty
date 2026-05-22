import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Star } from 'lucide-react';

export default function AgentPerformanceTable({ agentMetrics }) {
  const [sortBy, setSortBy] = useState('closedDeals');
  const [sortOrder, setSortOrder] = useState('desc');

  const sorted = [...agentMetrics].sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'desc' ? 
      <TrendingDown className="w-4 h-4 inline ml-1" /> : 
      <TrendingUp className="w-4 h-4 inline ml-1" />;
  };

  const getRatingBadge = (rating) => {
    if (!rating) return <Badge variant="outline">No ratings</Badge>;
    if (rating >= 4.5) return <Badge className="bg-green-100 text-green-800"><Star className="w-3 h-3 mr-1 fill-green-600" />{rating}</Badge>;
    if (rating >= 3.5) return <Badge className="bg-blue-100 text-blue-800"><Star className="w-3 h-3 mr-1 fill-blue-600" />{rating}</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800"><Star className="w-3 h-3 mr-1 fill-yellow-600" />{rating}</Badge>;
  };

  const getPerformanceBadge = (conversionRate) => {
    if (conversionRate >= 40) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (conversionRate >= 25) return <Badge className="bg-blue-100 text-blue-800">Medium</Badge>;
    return <Badge className="bg-orange-100 text-orange-800">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Performance Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Email</TableHead>
                <TableHead 
                  onClick={() => handleSort('totalLeadsAssigned')}
                  className="cursor-pointer hover:bg-slate-100"
                >
                  Leads Assigned {getSortIcon('totalLeadsAssigned')}
                </TableHead>
                <TableHead 
                  onClick={() => handleSort('closedDeals')}
                  className="cursor-pointer hover:bg-slate-100"
                >
                  Closed Deals {getSortIcon('closedDeals')}
                </TableHead>
                <TableHead 
                  onClick={() => handleSort('activeDeals')}
                  className="cursor-pointer hover:bg-slate-100"
                >
                  Active Deals {getSortIcon('activeDeals')}
                </TableHead>
                <TableHead 
                  onClick={() => handleSort('conversionRate')}
                  className="cursor-pointer hover:bg-slate-100"
                >
                  Conv. Rate {getSortIcon('conversionRate')}
                </TableHead>
                <TableHead 
                  onClick={() => handleSort('avgDealValue')}
                  className="cursor-pointer hover:bg-slate-100"
                >
                  Avg Deal Value {getSortIcon('avgDealValue')}
                </TableHead>
                <TableHead>Client Rating</TableHead>
                <TableHead>Reviews</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((agent, index) => (
                <TableRow key={agent.id} className={index % 2 === 0 ? 'bg-slate-50' : ''}>
                  <TableCell className="font-medium text-sm">
                    <div>
                      <p className="text-slate-900">{agent.user_email}</p>
                      <p className="text-xs text-slate-500">{agent.market_id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-slate-900">{agent.totalLeadsAssigned}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-green-600">{agent.closedDeals}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{agent.activeDeals}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold text-slate-900">{agent.conversionRate}%</span>
                      {getPerformanceBadge(agent.conversionRate)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-slate-900">
                      ${(agent.avgDealValue / 1000000).toFixed(2)}M
                    </span>
                  </TableCell>
                  <TableCell>
                    {getRatingBadge(agent.avgRating)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <span className="text-slate-600">{agent.totalFeedback}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {sorted.length === 0 && (
          <div className="py-8 text-center text-slate-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No agents found matching your criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}