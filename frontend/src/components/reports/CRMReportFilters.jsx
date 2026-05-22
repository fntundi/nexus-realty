import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';

export default function CRMReportFilters({ filters, onFiltersChange, onReset }) {
  const { data: agents = [] } = useQuery({
    queryKey: ['agents-filter'],
    queryFn: () => base44.entities.Agent.list('-user_email', 100),
  });

  const handleDateChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const handleAgentChange = (value) => {
    onFiltersChange({
      ...filters,
      selectedAgent: value === 'all' ? null : value
    });
  };

  const handleContactTypeChange = (value) => {
    onFiltersChange({
      ...filters,
      selectedContactType: value === 'all' ? null : value
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Start Date</label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">End Date</label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Agent</label>
            <Select value={filters.selectedAgent || 'all'} onValueChange={handleAgentChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.user_email}>
                    {agent.user_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Contact Type</label>
            <Select value={filters.selectedContactType || 'all'} onValueChange={handleContactTypeChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="seller">Seller</SelectItem>
                <SelectItem value="lender">Lender</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={onReset}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}