import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Zap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const STAGES = [
  { value: 'any', label: 'Any Stage' },
  { value: 'pre_qual', label: 'Pre-Qualification' },
  { value: 'showing', label: 'Showing' },
  { value: 'offer', label: 'Offer' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'closing', label: 'Closing' },
  { value: 'closed', label: 'Closed' },
];

const TO_STAGES = STAGES.filter(s => s.value !== 'any');

const ACTION_TYPES = [
  { value: 'create_task', label: 'Create Task' },
  { value: 'generate_checklist', label: 'Generate Checklist Task' },
  { value: 'send_notification', label: 'Send In-App Notification' },
  { value: 'send_email', label: 'Send Email' },
];

const ROLES = ['agent', 'buyer', 'lender', 'builder'];

const TEMPLATE_VARS = ['{{property_address}}', '{{buyer_email}}', '{{agent_email}}', '{{stage}}', '{{contract_price}}', '{{closing_date}}'];

const emptyAction = {
  action_type: 'create_task',
  title: '',
  description: '',
  assign_to_role: 'agent',
  priority: 'medium',
  due_days_offset: 3,
  notify_roles: []
};

export default function StageWorkflowRuleForm({ rule, markets, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => rule ? { ...rule } : {
    name: '',
    description: '',
    market_id: '',
    from_stage: 'any',
    to_stage: 'closing',
    is_active: true,
    actions: []
  });

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addAction = () => setForm(f => ({ ...f, actions: [...(f.actions || []), { ...emptyAction }] }));

  const updateAction = (idx, key, val) => {
    setForm(f => {
      const actions = [...(f.actions || [])];
      actions[idx] = { ...actions[idx], [key]: val };
      return { ...f, actions };
    });
  };

  const toggleNotifyRole = (idx, role) => {
    const current = form.actions[idx]?.notify_roles || [];
    updateAction(idx, 'notify_roles', current.includes(role) ? current.filter(r => r !== role) : [...current, role]);
  };

  const removeAction = (idx) => {
    setForm(f => ({ ...f, actions: f.actions.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!form.name || !form.to_stage) return;
    onSave(form);
  };

  return (
    <div className="space-y-6">
      {/* Rule basics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Rule Name *</Label>
          <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g., Under Contract → Closing Checklist" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder="What does this rule do?" rows={2} />
        </div>
        <div className="space-y-1">
          <Label>From Stage</Label>
          <Select value={form.from_stage} onValueChange={v => setField('from_stage', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>To Stage *</Label>
          <Select value={form.to_stage} onValueChange={v => setField('to_stage', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TO_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Market (optional)</Label>
          <Select value={form.market_id || ''} onValueChange={v => setField('market_id', v)}>
            <SelectTrigger><SelectValue placeholder="All Markets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Markets</SelectItem>
              {markets.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={form.is_active} onCheckedChange={v => setField('is_active', v)} />
          <Label>Active</Label>
        </div>
      </div>

      {/* Template variables hint */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500 mb-2 font-medium">Available template variables:</p>
        <div className="flex flex-wrap gap-1">
          {TEMPLATE_VARS.map(v => <code key={v} className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">{v}</code>)}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Actions</Label>
          <Button size="sm" variant="outline" onClick={addAction}>
            <Plus className="w-4 h-4 mr-1" /> Add Action
          </Button>
        </div>

        {(!form.actions || form.actions.length === 0) && (
          <p className="text-sm text-slate-400 text-center py-4">No actions yet. Add at least one action.</p>
        )}

        {form.actions?.map((action, idx) => (
          <Card key={idx} className="border border-slate-200">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Action {idx + 1}
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={() => removeAction(idx)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Action Type</Label>
                  <Select value={action.action_type} onValueChange={v => updateAction(idx, 'action_type', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Select value={action.priority} onValueChange={v => updateAction(idx, 'priority', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['low', 'medium', 'high', 'critical'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Title / Subject</Label>
                <Input className="h-8 text-xs" value={action.title} onChange={e => updateAction(idx, 'title', e.target.value)} placeholder="e.g., Final Closing Checklist for {{property_address}}" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description / Body</Label>
                <Textarea value={action.description} onChange={e => updateAction(idx, 'description', e.target.value)} placeholder="Detail the steps or email body. Use {{property_address}}, etc." rows={3} className="text-xs" />
              </div>

              {(action.action_type === 'create_task' || action.action_type === 'generate_checklist') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Assign To</Label>
                    <Select value={action.assign_to_role} onValueChange={v => updateAction(idx, 'assign_to_role', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due Days Offset</Label>
                    <Input type="number" className="h-8 text-xs" value={action.due_days_offset} onChange={e => updateAction(idx, 'due_days_offset', parseInt(e.target.value) || 3)} />
                  </div>
                </div>
              )}

              {(action.action_type === 'send_notification' || action.action_type === 'send_email') && (
                <div className="space-y-1">
                  <Label className="text-xs">Notify Roles</Label>
                  <div className="flex gap-3">
                    {ROLES.map(role => (
                      <div key={role} className="flex items-center gap-1">
                        <Checkbox
                          checked={(action.notify_roles || []).includes(role)}
                          onCheckedChange={() => toggleNotifyRole(idx, role)}
                          className="w-3 h-3"
                        />
                        <span className="text-xs capitalize">{role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving || !form.name || !form.to_stage}>
          {isSaving ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </div>
  );
}