import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MessageThread from '@/components/messaging/MessageThread';
import DealStageTimeline from '@/components/dealhub/DealStageTimeline';
import DealDocuments from '@/components/dealhub/DealDocuments';

export default function DealHub() {
  const [selectedId, setSelectedId] = useState(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['dealhub-deals', me?.email],
    enabled: !!me,
    queryFn: async () => {
      const [asBuyer, asLender, agents] = await Promise.all([
        base44.entities.Transaction.filter({ buyer_email: me.email }),
        base44.entities.Transaction.filter({ lender_email: me.email }),
        base44.entities.Agent.filter({ user_email: me.email }),
      ]);
      const asAgent = agents[0]
        ? await base44.entities.Transaction.filter({ agent_id: agents[0].id })
        : [];
      const all = me.role === 'admin' ? await base44.entities.Transaction.list('-created_date', 100) : [];
      const map = new Map();
      [...asBuyer, ...asLender, ...asAgent, ...all].forEach((t) => map.set(t.id, t));
      return [...map.values()];
    },
  });

  const deal = deals.find((d) => d.id === selectedId) || deals[0];

  const role = !me || !deal
    ? 'buyer'
    : me.role === 'admin'
    ? 'admin'
    : deal.lender_email === me.email
    ? 'lender'
    : deal.buyer_email === me.email
    ? 'buyer'
    : 'agent';

  if (isLoading || !me) return <div className="p-8 text-slate-500">Loading your deals...</div>;
  if (!deal) return <div className="p-8 text-slate-500">You are not part of any deals yet.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Deal Hub</h1>
        <p className="text-slate-600 text-sm">One shared view of the deal for the buyer, agent and lender.</p>
      </div>

      {deals.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {deals.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                d.id === deal.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700'
              }`}
            >
              {d.buyer_email}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Deal progress
                <Badge variant="outline" className="capitalize">{role}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-slate-600 space-y-1">
                <p>Buyer: {deal.buyer_email}</p>
                {deal.lender_email && <p>Lender: {deal.lender_email}</p>}
                {deal.closing_date && <p>Target closing: {deal.closing_date}</p>}
              </div>
              <DealStageTimeline transaction={deal} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
            <CardContent><DealDocuments transactionId={deal.id} role={role} /></CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Group messages</CardTitle></CardHeader>
            <CardContent>
              <MessageThread transactionId={deal.id} currentUserEmail={me.email} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}