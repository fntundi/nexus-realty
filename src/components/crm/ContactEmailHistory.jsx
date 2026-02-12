import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Eye,
  MousePointerClick,
  AlertCircle,
  LogOut,
  CheckCircle2,
  Circle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ContactEmailHistory({ contactEmail }) {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['emailCampaigns', contactEmail],
    queryFn: () => base44.entities.EmailCampaign.filter({ recipient_email: contactEmail }, '-sent_date'),
    enabled: !!contactEmail
  });

  const getBounceStatusBadge = (status) => {
    if (status === 'hard') return <Badge variant="destructive">Hard Bounce</Badge>;
    if (status === 'soft') return <Badge className="bg-orange-100 text-orange-800">Soft Bounce</Badge>;
    return <Badge variant="outline">Delivered</Badge>;
  };

  const getStatusIcon = (campaign) => {
    if (campaign.unsubscribed) {
      return <LogOut className="w-4 h-4 text-orange-500" />;
    }
    if (campaign.bounce_status !== 'none') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (campaign.open_count > 0) {
      return <Eye className="w-4 h-4 text-green-500" />;
    }
    return <Circle className="w-4 h-4 text-slate-400" />;
  };

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 text-center">
          <Mail className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No email campaigns sent to this contact</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total Sent</p>
            <p className="text-3xl font-bold text-slate-900">{campaigns.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Opened</p>
            <p className="text-3xl font-bold text-green-600">
              {campaigns.filter(c => c.open_count > 0).length}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {((campaigns.filter(c => c.open_count > 0).length / campaigns.length) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Clicked</p>
            <p className="text-3xl font-bold text-blue-600">
              {campaigns.filter(c => c.click_count > 0).length}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {((campaigns.filter(c => c.click_count > 0).length / campaigns.length) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Bounced</p>
            <p className="text-3xl font-bold text-red-600">
              {campaigns.filter(c => c.bounce_status !== 'none').length}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {campaigns.filter(c => c.unsubscribed).length} unsubscribed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead className="text-center">Opens</TableHead>
                  <TableHead className="text-center">Clicks</TableHead>
                  <TableHead>Bounce Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(campaign => (
                  <TableRow key={campaign.id} className="hover:bg-slate-50">
                    <TableCell>
                      {getStatusIcon(campaign)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{campaign.subject}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(campaign.sent_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-slate-900">
                      {campaign.open_count}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-slate-900">
                      {campaign.click_count}
                    </TableCell>
                    <TableCell>
                      {getBounceStatusBadge(campaign.bounce_status)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {campaign.unsubscribed && '📬 Unsubscribed'}
                      {campaign.bounce_reason && `${campaign.bounce_reason}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}