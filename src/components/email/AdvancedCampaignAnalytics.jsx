import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Mail, Eye, MousePointerClick, AlertCircle, LogOut } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export default function AdvancedCampaignAnalytics({ sequenceId }) {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['emailCampaigns', sequenceId],
    queryFn: () =>
      sequenceId
        ? base44.entities.EmailCampaign.filter({ sequence_id: sequenceId })
        : base44.entities.EmailCampaign.list('-sent_date', 100)
  });

  const stats = {
    sent: campaigns.length,
    opened: campaigns.filter(c => c.open_count > 0).length,
    clicked: campaigns.filter(c => c.click_count > 0).length,
    bounced: campaigns.filter(c => c.bounce_status !== 'none').length,
    unsubscribed: campaigns.filter(c => c.unsubscribed).length,
    openRate: campaigns.length > 0 ? ((campaigns.filter(c => c.open_count > 0).length / campaigns.length) * 100).toFixed(1) : 0,
    clickRate: campaigns.length > 0 ? ((campaigns.filter(c => c.click_count > 0).length / campaigns.length) * 100).toFixed(1) : 0,
    bounceRate: campaigns.length > 0 ? ((campaigns.filter(c => c.bounce_status !== 'none').length / campaigns.length) * 100).toFixed(1) : 0,
    unsubscribeRate: campaigns.length > 0 ? ((campaigns.filter(c => c.unsubscribed).length / campaigns.length) * 100).toFixed(1) : 0
  };

  const bounceReasons = campaigns
    .filter(c => c.bounce_reason)
    .reduce((acc, c) => {
      const reason = c.bounce_reason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

  const bounceData = Object.entries(bounceReasons).map(([reason, count]) => ({
    name: reason,
    value: count
  }));

  const statusData = [
    { name: 'Sent', value: stats.sent, color: '#3b82f6' },
    { name: 'Opened', value: stats.opened, color: '#10b981' },
    { name: 'Clicked', value: stats.clicked, color: '#a855f7' },
    { name: 'Bounced', value: stats.bounced, color: '#ef4444' },
    { name: 'Unsubscribed', value: stats.unsubscribed, color: '#f97316' }
  ];

  const bounceTypeData = [
    {
      name: 'Hard Bounce',
      value: campaigns.filter(c => c.bounce_status === 'hard').length
    },
    {
      name: 'Soft Bounce',
      value: campaigns.filter(c => c.bounce_status === 'soft').length
    },
    {
      name: 'Delivered',
      value: campaigns.filter(c => c.bounce_status === 'none').length
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Sent</p>
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
                <p className="text-sm text-slate-600">Bounced</p>
                <p className="text-3xl font-bold text-red-600">{stats.bounced}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
            <p className="text-xs text-slate-600 mt-2">{stats.bounceRate}% bounce rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Unsubscribed</p>
                <p className="text-3xl font-bold text-orange-600">{stats.unsubscribed}</p>
              </div>
              <LogOut className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
            <p className="text-xs text-slate-600 mt-2">{stats.unsubscribeRate}% unsubscribe rate</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bounce Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bounceTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {bounceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bounce Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bounceData.map((reason, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                  <span className="font-medium text-slate-900">{reason.name}</span>
                  <Badge variant="outline">{reason.value}</Badge>
                </div>
              ))}
            </div>
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
                  {campaign.bounce_status !== 'none' && (
                    <Badge variant="destructive">{campaign.bounce_status} bounce</Badge>
                  )}
                  {campaign.unsubscribed && (
                    <Badge variant="secondary">Unsubscribed</Badge>
                  )}
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{campaign.open_count}</p>
                    <p className="text-slate-600">Opens</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}