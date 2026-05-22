import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Mail, Eye, MousePointerClick } from 'lucide-react';

export default function CampaignAnalytics() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['emailCampaigns'],
    queryFn: () => base44.entities.EmailCampaign.list('-sent_date', 100)
  });

  const stats = {
    sent: campaigns.length,
    opened: campaigns.filter(c => c.open_count > 0).length,
    clicked: campaigns.filter(c => c.click_count > 0).length,
    openRate: campaigns.length > 0 ? ((campaigns.filter(c => c.open_count > 0).length / campaigns.length) * 100).toFixed(1) : 0,
    clickRate: campaigns.length > 0 ? ((campaigns.filter(c => c.click_count > 0).length / campaigns.length) * 100).toFixed(1) : 0
  };

  const dailyData = campaigns.reduce((acc, c) => {
    if (!c.sent_date) return acc;
    const date = new Date(c.sent_date).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.sent++;
      if (c.open_count > 0) existing.opened++;
      if (c.click_count > 0) existing.clicked++;
    } else {
      acc.push({
        date,
        sent: 1,
        opened: c.open_count > 0 ? 1 : 0,
        clicked: c.click_count > 0 ? 1 : 0
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Emails Sent</p>
                <p className="text-3xl font-bold text-slate-900">{stats.sent}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Opened</p>
                <p className="text-3xl font-bold text-slate-900">{stats.opened}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Clicked</p>
                <p className="text-3xl font-bold text-slate-900">{stats.clicked}</p>
              </div>
              <MousePointerClick className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600">Open Rate</p>
              <p className="text-3xl font-bold text-slate-900">{stats.openRate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600">Click Rate</p>
              <p className="text-3xl font-bold text-slate-900">{stats.clickRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#3b82f6" />
                <Line type="monotone" dataKey="opened" stroke="#10b981" />
                <Line type="monotone" dataKey="clicked" stroke="#a855f7" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.slice(0, 10).map(campaign => (
              <div key={campaign.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{campaign.recipient_email}</p>
                  <p className="text-sm text-slate-600">{campaign.subject}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{campaign.open_count}</p>
                    <p className="text-slate-600">Opens</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{campaign.click_count}</p>
                    <p className="text-slate-600">Clicks</p>
                  </div>
                  <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                    {campaign.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}