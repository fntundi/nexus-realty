import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import CRMReportFilters from '../components/reports/CRMReportFilters';
import LeadConversionChart from '../components/reports/LeadConversionChart';
import PipelineStagesChart from '../components/reports/PipelineStagesChart';
import ContactActivityChart from '../components/reports/ContactActivityChart';
import LeadScoreTrendsChart from '../components/reports/LeadScoreTrendsChart';
import RuleExecutionHistory from '../components/reports/RuleExecutionHistory';
import { TrendingUp, Users, Target, Activity } from 'lucide-react';

const defaultStartDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
const defaultEndDate = format(new Date(), 'yyyy-MM-dd');

export default function CRMReportingDashboard() {
  const [filters, setFilters] = useState({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    selectedAgent: null,
    selectedContactType: null
  });

  // Fetch all data in parallel
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts-report'],
    queryFn: () => base44.entities.Contact.list('-updated_date', 500),
  });

  const { data: interactions = [], isLoading: interactionsLoading } = useQuery({
    queryKey: ['interactions-report'],
    queryFn: () => base44.entities.Interaction.list('-interaction_date', 500),
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions-report'],
    queryFn: () => base44.entities.Transaction.list('-updated_date', 500),
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['rules-report'],
    queryFn: () => base44.entities.LeadScoringRule.list('-last_execution', 100),
  });

  const isLoading = contactsLoading || interactionsLoading || transactionsLoading || rulesLoading;

  // Filter interactions by date range
  const filteredInteractions = useMemo(() => {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    return interactions.filter(interaction => {
      const intDate = new Date(interaction.interaction_date);
      return intDate >= startDate && intDate <= endDate;
    });
  }, [interactions, filters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);

    const recentContacts = contacts.filter(c => {
      const createdDate = new Date(c.created_date);
      if (filters.selectedContactType && c.contact_type !== filters.selectedContactType) return false;
      if (filters.selectedAgent && c.assigned_agent_email !== filters.selectedAgent) return false;
      return createdDate >= startDate && createdDate <= endDate;
    });

    const avgLeadScore = recentContacts.length > 0
      ? (recentContacts.reduce((sum, c) => sum + (c.lead_score || 0), 0) / recentContacts.length).toFixed(1)
      : 0;

    const activeContacts = contacts.filter(c => {
      if (filters.selectedAgent && c.assigned_agent_email !== filters.selectedAgent) return false;
      return c.status === 'active';
    }).length;

    const totalInteractions = filteredInteractions.length;

    return {
      totalContacts: recentContacts.length,
      avgLeadScore,
      activeContacts,
      totalInteractions
    };
  }, [contacts, filteredInteractions, filters]);

  const handleReset = () => {
    setFilters({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      selectedAgent: null,
      selectedContactType: null
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-slate-900">CRM Reporting Dashboard</h1>
          <Skeleton className="h-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CRM Reporting Dashboard</h1>
          <p className="text-slate-600 mt-1">Analyze leads, conversions, and agent performance</p>
        </div>

        {/* Filters */}
        <CRMReportFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleReset}
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Contacts</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalContacts}</div>
              <p className="text-xs text-slate-600 mt-1">In selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Lead Score</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{metrics.avgLeadScore}</div>
              <p className="text-xs text-slate-600 mt-1">Out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contacts</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{metrics.activeContacts}</div>
              <p className="text-xs text-slate-600 mt-1">Current active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalInteractions}</div>
              <p className="text-xs text-slate-600 mt-1">In period</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadConversionChart contacts={contacts} filters={filters} />
          <PipelineStagesChart transactions={transactions} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContactActivityChart interactions={filteredInteractions} filters={filters} />
          <LeadScoreTrendsChart contacts={contacts} filters={filters} />
        </div>

        {/* Rule Execution History */}
        <RuleExecutionHistory rules={rules} filters={filters} />
      </div>
    </div>
  );
}