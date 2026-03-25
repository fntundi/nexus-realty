import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, MousePointer, Eye, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

export default function EmailTrackingPanel({ agentEmail }) {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['email-campaigns', agentEmail],
    queryFn: () => base44.entities.EmailCampaign.list('-created_date', 20),
    enabled: !!agentEmail
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ['email-sequences', agentEmail],
    queryFn: () => base44.entities.EmailSequence.list('-created_date', 10),
    enabled: !!agentEmail
  });

  const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((s, c) => s + (c.open_count || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.click_count || 0), 0);

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalSent.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Emails Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{pct(totalOpens, totalSent)}%</p>
              <p className="text-xs text-slate-500">Open Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MousePointer className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{pct(totalClicks, totalSent)}%</p>
              <p className="text-xs text-slate-500">Click Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Recent Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">No campaigns yet. Create one in Email Automation.</p>
          ) : (
            <div className="divide-y">
              {campaigns.map(c => {
                const openRate = pct(c.open_count || 0, c.sent_count || 0);
                const clickRate = pct(c.click_count || 0, c.sent_count || 0);
                return (
                  <div key={c.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{c.name || c.subject}</p>
                      <p className="text-xs text-slate-500">
                        {c.created_date ? format(new Date(c.created_date), 'MMM d, yyyy') : ''} · {c.sent_count || 0} sent
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1 text-blue-600">
                        <Eye className="w-3 h-3" />
                        <span>{openRate}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-600">
                        <MousePointer className="w-3 h-3" />
                        <span>{clickRate}%</span>
                      </div>
                      <Badge className={c.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {c.status || 'draft'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sequences */}
      {sequences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Nurture Sequences</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {sequences.map(s => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.step_count || 0} steps · {s.enrolled_count || 0} enrolled</p>
                  </div>
                  <Badge className={s.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                    {s.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}