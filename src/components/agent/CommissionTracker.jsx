import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  earned: 'bg-green-100 text-green-800',
  paid: 'bg-blue-100 text-blue-800'
};

export default function CommissionTracker({ transactions = [] }) {
  const [editing, setEditing] = useState(null); // transaction id
  const [editValues, setEditValues] = useState({});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-transactions']);
      setEditing(null);
      toast.success('Commission updated');
    }
  });

  const totalEarned = transactions.reduce((sum, t) => {
    if (t.commission_status === 'earned' || t.commission_status === 'paid') {
      return sum + (t.commission_amount || 0);
    }
    return sum;
  }, 0);

  const totalPaid = transactions.reduce((sum, t) => {
    if (t.commission_status === 'paid') return sum + (t.commission_amount || 0);
    return sum;
  }, 0);

  const totalPipeline = transactions.reduce((sum, t) => {
    const price = t.contract_price || t.offer_amount || 0;
    const pct = t.commission_percentage || 3;
    return sum + (price * pct / 100);
  }, 0);

  const startEdit = (t) => {
    setEditing(t.id);
    setEditValues({
      commission_amount: t.commission_amount || '',
      commission_percentage: t.commission_percentage || 3,
      commission_status: t.commission_status || 'pending'
    });
  };

  const saveEdit = (id) => {
    updateMutation.mutate({ id, data: editValues });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total Earned</p>
            <p className="text-2xl font-bold text-green-700">${totalEarned.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total Paid Out</p>
            <p className="text-2xl font-bold text-blue-700">${totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Pipeline Potential</p>
            <p className="text-2xl font-bold text-yellow-700">${Math.round(totalPipeline).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Deal Commission Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-4 h-4" />
            Commission by Deal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No active deals.</p>
          ) : (
            <div className="divide-y">
              {transactions.map(t => (
                <div key={t.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{t.buyer_email}</p>
                    <p className="text-xs text-slate-500">{t.current_stage?.replace(/_/g, ' ')} · Contract: ${(t.contract_price || t.offer_amount || 0).toLocaleString()}</p>
                  </div>

                  {editing === t.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editValues.commission_amount}
                        onChange={e => setEditValues(v => ({ ...v, commission_amount: Number(e.target.value) }))}
                        placeholder="Amount $"
                        className="w-28 h-8 text-sm"
                      />
                      <Select
                        value={editValues.commission_status}
                        onValueChange={val => setEditValues(v => ({ ...v, commission_status: val }))}
                      >
                        <SelectTrigger className="w-28 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="earned">Earned</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => saveEdit(t.id)} className="h-8 px-2">
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {t.commission_amount ? `$${t.commission_amount.toLocaleString()}` : '—'}
                      </span>
                      <Badge className={STATUS_COLORS[t.commission_status || 'pending']}>
                        {t.commission_status || 'pending'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(t)} className="h-7 px-2">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}