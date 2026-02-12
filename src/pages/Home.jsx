import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Users, TrendingUp, Building2, UserCheck,
  Zap, BarChart3, MapPin, MessageSquare, Calendar, Settings,
  ArrowRight, DollarSign, FileText, Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Home() {
  return <AudienceTabsHome />;
}

function BuilderDashboard() {
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date')
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list()
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const stats = {
    totalLeads: leads.length,
    unassignedLeads: leads.filter(l => l.status === 'unassigned').length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    activeTransactions: transactions.filter(t => t.status === 'active').length
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Builder Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage your lead pool, agents, and team operations</p>
          </div>
          <Link to={createPageUrl('LeadPool')}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Users className="w-4 h-4 mr-2" />
              View Lead Pool
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Unassigned</CardTitle>
              <UserCheck className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.unassignedLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Agents</CardTitle>
              <Building2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAgents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Deals</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeTransactions}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="text-center py-8 text-slate-500">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No leads yet</div>
            ) : (
              <div className="space-y-3">
                {leads.slice(0, 5).map(lead => (
                  <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{lead.buyer_name}</div>
                      <div className="text-sm text-slate-600">
                        {lead.buyer_email} • {lead.source?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {markets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Markets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {markets.map(market => (
                  <div key={market.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="font-medium text-slate-900">{market.name}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {market.state}, {market.country}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AudienceTabsHome() {
  return (
    <div className="min-h-screen bg-white">
      {/* Luxury Hero Section */}
      <div className="relative bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
        {/* Decorative gold accent lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600"></div>
        
        <div className="max-w-6xl mx-auto px-6 py-20 text-center space-y-6">
          <div className="inline-block px-4 py-2 bg-yellow-600 bg-opacity-20 rounded-full border border-yellow-500 mb-4">
            <span className="text-yellow-500 text-sm font-semibold">Premium Real Estate Platform</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight">Real Estate OS</h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light">
            Enterprise-grade platform trusted by premium brokerages. Sophisticated tools for modern real estate professionals.
          </p>
        </div>
      </div>

      {/* Premium Tabs Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <Tabs defaultValue="agent" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-12 bg-gray-50 border-b-2 border-gray-200 p-1 rounded-none">
            <TabsTrigger value="agent" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Agent</span>
            </TabsTrigger>
            <TabsTrigger value="buyer" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Buyer</span>
            </TabsTrigger>
            <TabsTrigger value="lender" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Lender</span>
            </TabsTrigger>
            <TabsTrigger value="developer" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Developer</span>
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Builder</span>
            </TabsTrigger>
          </TabsList>

          {/* Agent Tab */}
          <TabsContent value="agent" className="space-y-8 pt-8">
            <div className="space-y-4 border-b-2 border-gray-200 pb-8">
              <h2 className="text-4xl font-bold text-black">For Agents</h2>
              <p className="text-lg text-gray-700">Manage your pipeline efficiently. Close more deals with less friction.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeatureCard
                icon={<Zap className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Lead Score Dashboard"
                description="See your hot leads at a glance. Focus on prospects most likely to convert—all sorted and prioritized for you."
              />
              <FeatureCard
                icon={<MessageSquare className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Client Communication"
                description="One thread with each buyer. Chat, share documents, and schedule showings without jumping between tools."
              />
              <FeatureCard
                icon={<Calendar className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Deal Tracking"
                description="From offer to closing—track every milestone, document, and task in real time. Nothing falls through the cracks."
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Task Management"
                description="Stay on top of follow-ups, showings, and next steps. See what's due today. Keep the pipeline moving."
              />
            </div>

            <div className="mt-12 p-8 bg-gradient-to-br from-gray-900 to-black border border-gray-300 rounded-lg text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to manage your pipeline?</h3>
              <p className="text-gray-300 mb-6">Get your dashboard with all your leads, deals, and tasks in one place</p>
              <Link to={createPageUrl('AgentDashboard')}>
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-black text-lg px-8 font-semibold">
                  Go to Agent Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* Lender Tab */}
          <TabsContent value="lender" className="space-y-8 pt-8">
            <div className="space-y-4 border-b-2 border-gray-200 pb-8">
              <h2 className="text-4xl font-bold text-black">For Lenders</h2>
              <p className="text-lg text-gray-700">Manage loan portfolios and streamline the lending process</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeatureCard
                icon={<DollarSign className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Loan Portfolio Dashboard"
                description="View all active loans at a glance. Track loan amounts, borrowers, closing dates, and current stage for each transaction."
              />
              <FeatureCard
                icon={<FileText className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Document Management"
                description="Upload and organize loan documents securely. Appraisals, approvals, conditions, and disclosures all in one place."
              />
              <FeatureCard
                icon={<MessageSquare className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Direct Communication"
                description="Chat with buyers and agents directly. No email chains—everything organized by transaction."
              />
              <FeatureCard
                icon={<TrendingUp className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Loan Status Tracking"
                description="Follow each loan from pre-qualification through closing. See what stage each deal is in and what's needed next."
              />
            </div>

            <div className="mt-12 p-8 bg-gradient-to-br from-gray-900 to-black border border-gray-300 rounded-lg text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to manage your loan portfolio?</h3>
              <p className="text-gray-300 mb-6">Access your dashboard with all your active loans and documents</p>
              <Link to={createPageUrl('LenderPortal')}>
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-black text-lg px-8 font-semibold">
                  Go to Lender Portal
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* Buyer Tab */}
          <TabsContent value="buyer" className="space-y-8 pt-8">
            <div className="space-y-4 border-b-2 border-gray-200 pb-8">
              <h2 className="text-4xl font-bold text-black">For Buyers</h2>
              <p className="text-lg text-gray-700">Find your dream property with personalized recommendations and expert guidance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeatureCard
                icon={<MapPin className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Smart Property Search"
                description="Filter by location, price, amenities, and more. Save your favorite searches and get instant alerts on new listings."
              />
              <FeatureCard
                icon={<MessageSquare className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Agent Communication"
                description="Chat directly with your agent, ask questions, and get expert advice whenever you need it."
              />
              <FeatureCard
                icon={<Calendar className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Showing Scheduler"
                description="Book property showings at your convenience. Get instant confirmations and directions."
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Deal Transparency"
                description="Track your transaction from offer to closing. Access documents and status updates in one place."
              />
            </div>
          </TabsContent>

          {/* Developer Tab */}
          <TabsContent value="developer" className="space-y-8 pt-8">
            <div className="space-y-4 border-b-2 border-gray-200 pb-8">
              <h2 className="text-4xl font-bold text-black">For Real Estate Developers</h2>
              <p className="text-lg text-gray-700">Manage land portfolios, development projects, and buyer inquiries</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeatureCard
                icon={<MapPin className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Land Portfolio"
                description="Organize and manage multiple land parcels. Track zoning, approvals, infrastructure, and buyer interest."
              />
              <FeatureCard
                icon={<TrendingUp className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Buyer Pipeline"
                description="Capture and qualify developer buyers. Track which projects interest them and move deals forward."
              />
              <FeatureCard
                icon={<MessageSquare className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Project Updates"
                description="Keep stakeholders, brokers, and prospective buyers updated on project milestones and status."
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Deal Analytics"
                description="Track deal velocity, buyer conversion, and project profitability across your portfolio."
              />
            </div>
          </TabsContent>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-8 pt-8">
            <div className="space-y-4 border-b-2 border-gray-200 pb-8">
              <h2 className="text-4xl font-bold text-black">For Builders & Teams</h2>
              <p className="text-lg text-gray-700">Manage agents, properties, and deals. Build your brokerage from one platform.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeatureCard
                icon={<Users className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Agent Management"
                description="Hire, monitor, and support your sales team. See everyone's pipeline, commissions, and performance."
              />
              <FeatureCard
                icon={<TrendingUp className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Deal Pipeline"
                description="View all deals in progress across your team. See bottlenecks, manage closings, forecast revenue."
              />
              <FeatureCard
                icon={<Settings className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Lead Distribution"
                description="Auto-assign and manually route leads to the right agents. Keep your team fed with qualified prospects."
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                title="Team Analytics"
                description="Track KPIs, conversion rates, and profitability by agent. Identify top performers and coaching opportunities."
              />
            </div>

            {/* Premium CTA */}
            <div className="mt-12 p-8 bg-gradient-to-br from-gray-900 to-black border border-gray-300 rounded-lg text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to manage your brokerage?</h3>
              <p className="text-gray-300 mb-6">Access your premium dashboard with team management and advanced analytics</p>
              <Link to={createPageUrl('LeadPool')}>
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-black text-lg px-8 font-semibold">
                  Go to Brokerage Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <Card className="border border-gray-200 hover:border-yellow-500 hover:shadow-xl transition-all bg-white">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-lg font-semibold text-black">{title}</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}