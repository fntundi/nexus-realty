import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Flame, Clock, CheckCircle2, AlertCircle, TrendingUp, 
  Phone, Mail, MapPin, DollarSign, Calendar, ArrowRight, Bell, BarChart3 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import FollowUpReminders from '../components/agent/FollowUpReminders';
import PerformanceAnalytics from '../components/agent/PerformanceAnalytics';

export default function AgentDashboard() {
  const [selectedView, setSelectedView] = useState('hot-leads');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Get agent's leads
  const { data: leads = [] } = useQuery({
    queryKey: ['agent-leads', user?.email],
    queryFn: () => base44.entities.Contact.filter(
      { assigned_agent_email: user?.email },
      '-last_interaction_date'
    ),
    enabled: !!user?.email
  });

  // Get agent's active transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['agent-transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter(
      { agent_email: user?.email, status: 'active' },
      '-updated_date'
    ),
    enabled: !!user?.email
  });

  // Get overdue tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['agent-tasks', user?.email],
    queryFn: () => base44.entities.Task.filter(
      { assigned_to_email: user?.email, status: ['pending', 'in_progress'] },
      'due_date'
    ),
    enabled: !!user?.email
  });

  // Get properties for reference
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate metrics
  const hotLeads = leads.filter(l => l.lead_score >= 75);
  const warmLeads = leads.filter(l => l.lead_score >= 50 && l.lead_score < 75);
  const inactiveLeads = leads.filter(l => {
    if (!l.last_interaction_date) return true;
    const daysSince = differenceInDays(new Date(), new Date(l.last_interaction_date));
    return daysSince > 7;
  });

  const overdueTransactions = transactions.filter(t => {
    if (!t.updated_date) return false;
    const daysSince = differenceInDays(new Date(), new Date(t.updated_date));
    return daysSince > 14;
  });

  const overdueTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Pipeline</h1>
          <p className="text-slate-600 mt-1">{user.full_name} • Focus on what matters most</p>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Hot Leads"
            value={hotLeads.length}
            icon={<Flame className="w-4 h-4 text-red-500" />}
            color="red"
            onClick={() => setSelectedView('hot-leads')}
          />
          <MetricCard
            label="Warm Leads"
            value={warmLeads.length}
            icon={<TrendingUp className="w-4 h-4 text-yellow-500" />}
            color="yellow"
            onClick={() => setSelectedView('warm-leads')}
          />
          <MetricCard
            label="Active Deals"
            value={transactions.length}
            icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
            color="green"
            onClick={() => setSelectedView('transactions')}
          />
          <MetricCard
            label="Due Today"
            value={overdueTasks.length}
            icon={<Clock className="w-4 h-4 text-orange-500" />}
            color="orange"
            onClick={() => setSelectedView('tasks')}
          />
        </div>

        {/* Alerts & Warnings */}
        {(overdueTransactions.length > 0 || inactiveLeads.length > 0) && (
          <Card className="border-l-4 border-l-orange-500 bg-orange-50">
            <CardContent className="p-4 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                {overdueTransactions.length > 0 && (
                  <p className="text-sm text-orange-900">
                    <strong>{overdueTransactions.length} deals</strong> haven't had activity in 14+ days
                  </p>
                )}
                {inactiveLeads.length > 0 && (
                  <p className="text-sm text-orange-900">
                    <strong>{inactiveLeads.length} leads</strong> are inactive (7+ days)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={selectedView} onValueChange={setSelectedView} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="hot-leads">Hot Leads</TabsTrigger>
            <TabsTrigger value="warm-leads">Warm Leads</TabsTrigger>
            <TabsTrigger value="transactions">Active Deals</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="w-4 h-4 mr-2" />
              Follow-Ups
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Hot Leads */}
          <TabsContent value="hot-leads" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">High-Priority Leads</h2>
                <p className="text-sm text-slate-600">Score 75+: Most likely to convert</p>
              </div>
            </div>

            {hotLeads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  No hot leads yet. Build your portfolio by nurturing warm leads.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {hotLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Warm Leads */}
          <TabsContent value="warm-leads" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Building Relationships</h2>
                <p className="text-sm text-slate-600">Score 50-74: Nurture these regularly</p>
              </div>
            </div>

            {warmLeads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  No warm leads. Start by adding contacts or generating leads.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {warmLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Active Deals */}
          <TabsContent value="transactions" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Deals in Progress</h2>
                <p className="text-sm text-slate-600">Keep transactions moving forward</p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  No active deals. Convert leads to transactions to track them here.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {transactions.map(txn => (
                  <TransactionCard key={txn.id} transaction={txn} getProperty={getProperty} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tasks */}
          <TabsContent value="tasks" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Action Items</h2>
                <p className="text-sm text-slate-600">Stay on top of follow-ups and commitments</p>
              </div>
            </div>

            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  No pending tasks. You're all caught up!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <TaskCard key={task.id} task={task} isOverdue={new Date(task.due_date) < new Date()} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Follow-Up Reminders */}
          <TabsContent value="reminders" className="mt-6">
            <FollowUpReminders agentEmail={user?.email} />
          </TabsContent>

          {/* Performance Analytics */}
          <TabsContent value="analytics" className="mt-6">
            <PerformanceAnalytics agentEmail={user?.email} />
          </TabsContent>
        </Tabs>

        {/* Quick Action Button */}
        <Link to={createPageUrl('Contacts')}>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base">
            <ArrowRight className="w-4 h-4 mr-2" />
            View All Contacts & Manage Pipeline
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color, onClick }) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200'
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all border ${colorClasses[color]}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}

function LeadCard({ lead }) {
  const scoreColor = lead.lead_score >= 75 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900">{lead.first_name} {lead.last_name}</h3>
              <Badge className={scoreColor}>{lead.lead_score}%</Badge>
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  {lead.email}
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  {lead.phone}
                </div>
              )}
              {lead.last_interaction_date && (
                <div className="text-xs text-slate-500">
                  Last contact: {format(new Date(lead.last_interaction_date), 'MMM d')}
                </div>
              )}
            </div>
          </div>
          <Link to={createPageUrl(`ContactDetails?id=${lead.id}`)}>
            <Button size="sm" variant="outline">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionCard({ transaction, getProperty }) {
  const property = getProperty(transaction.property_id);
  const stageBadgeColor = {
    pre_qual: 'bg-yellow-100 text-yellow-800',
    showing: 'bg-blue-100 text-blue-800',
    offer: 'bg-purple-100 text-purple-800',
    under_contract: 'bg-orange-100 text-orange-800',
    closing: 'bg-green-100 text-green-800'
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{property?.address || 'Property TBD'}</h3>
              <Badge className={stageBadgeColor[transaction.current_stage]}>
                {transaction.current_stage.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              {property?.price && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  ${property.price.toLocaleString()}
                </div>
              )}
              {transaction.closing_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(transaction.closing_date), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
          <Link to={createPageUrl(`AgentTransactions?id=${transaction.id}`)}>
            <Button size="sm" variant="outline">
              Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task, isOverdue }) {
  const priorityColor = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
    critical: 'bg-red-200 text-red-900'
  };

  return (
    <Card className={isOverdue ? 'border-l-4 border-l-red-500 bg-red-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-slate-900">{task.title}</h4>
              <Badge className={priorityColor[task.priority]}>
                {task.priority}
              </Badge>
              {isOverdue && <Badge variant="destructive">Overdue</Badge>}
            </div>
            <p className="text-sm text-slate-600 mb-2">{task.description}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}</span>
            </div>
          </div>
          <Button size="sm" variant="outline">
            Complete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}