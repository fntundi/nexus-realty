import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Zap, Mail, Users, ChevronRight, Pencil, Trash2,
  Play, Pause, BarChart2, Clock, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import DripSequenceBuilder from '@/components/drip/DripSequenceBuilder';

const TRIGGER_LABELS = {
  score_threshold: 'Lead Score Threshold',
  score_increase:  'Score Increase',
  inactivity:      'Inactivity Period',
  lead_status_change: 'Lead Status Change',
  manual:          'Manual Enrollment',
};

const TRIGGER_DESCRIPTIONS = {
  score_threshold: 'Fires when a lead score enters a defined range',
  score_increase:  'Fires when a lead score jumps by a set amount',
  inactivity:      'Fires after a contact has no interactions for N days',
  lead_status_change: 'Fires when a lead changes to a specific status',
  manual:          'Manually enroll contacts from the Contacts page',
};

const DEFAULT_CAMPAIGN = {
  name: '', description: '', is_active: true,
  trigger_type: 'score_threshold',
  trigger_config: { score_min: 70, score_max: 100, inactivity_days: 14, contact_type: 'any' },
  steps: [],
  stop_on_reply: true, stop_on_stage_change: true,
};

export default function DripCampaignEngine() {
  const qc = useQueryClient();
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [form, setForm]                 = useState(DEFAULT_CAMPAIGN);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState('campaigns'); // 'campaigns' | 'enrollments'
  const [runningId, setRunningId]       = useState(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['drip-campaigns'],
    queryFn: () => base44.entities.DripCampaign.list('-created_date', 100),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['drip-enrollments'],
    queryFn: () => base44.entities.DripEnrollment.list('-enrolled_date', 200),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...DEFAULT_CAMPAIGN, steps: [] });
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ ...c });
    setShowForm(true);
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setTrigger = (k, v) => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, [k]: v } }));

  const save = async () => {
    if (!form.name.trim()) return toast.error('Campaign name is required');
    if (form.steps.length === 0) return toast.error('Add at least one step');
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.DripCampaign.update(editing.id, form);
        toast.success('Campaign updated');
      } else {
        await base44.entities.DripCampaign.create({ ...form, execution_count: 0, enrolled_count: 0 });
        toast.success('Campaign created');
      }
      qc.invalidateQueries(['drip-campaigns']);
      setShowForm(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    await base44.entities.DripCampaign.update(c.id, { is_active: !c.is_active });
    qc.invalidateQueries(['drip-campaigns']);
    toast.success(c.is_active ? 'Campaign paused' : 'Campaign activated');
  };

  const deleteCampaign = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    await base44.entities.DripCampaign.delete(c.id);
    qc.invalidateQueries(['drip-campaigns']);
    toast.success('Deleted');
  };

  const runNow = async (c) => {
    setRunningId(c.id);
    try {
      const res = await base44.functions.invoke('executeDripCampaign', { campaign_id: c.id });
      toast.success(`Executed: ${res.data?.enrolled || 0} enrolled, ${res.data?.sent || 0} messages sent`);
      qc.invalidateQueries(['drip-campaigns']);
      qc.invalidateQueries(['drip-enrollments']);
    } catch (e) {
      toast.error('Execution failed: ' + e.message);
    } finally {
      setRunningId(null);
    }
  };

  const enrollmentsByCampaign = useMemo(() => {
    return enrollments.reduce((acc, e) => {
      acc[e.campaign_id] = (acc[e.campaign_id] || []);
      acc[e.campaign_id].push(e);
      return acc;
    }, {});
  }, [enrollments]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" /> Drip Campaign Engine
            </h1>
            <p className="text-slate-500 text-sm mt-1">Automated email & SMS sequences triggered by lead behavior</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Campaigns', value: campaigns.length, icon: <Zap className="w-4 h-4" />, color: 'text-blue-600' },
            { label: 'Active', value: campaigns.filter(c => c.is_active).length, icon: <Play className="w-4 h-4" />, color: 'text-green-600' },
            { label: 'Enrolled Contacts', value: enrollments.filter(e => e.status === 'active').length, icon: <Users className="w-4 h-4" />, color: 'text-purple-600' },
            { label: 'Messages Sent', value: enrollments.reduce((s, e) => s + (e.completed_steps?.length || 0), 0), icon: <Mail className="w-4 h-4" />, color: 'text-orange-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${s.color}`}>{s.icon}</div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {['campaigns', 'enrollments'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Campaigns tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-3">
            {isLoading && <div className="text-center py-12 text-slate-400">Loading…</div>}
            {!isLoading && campaigns.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No campaigns yet. Create your first drip sequence.</p>
                  <Button className="mt-4" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Create Campaign</Button>
                </CardContent>
              </Card>
            )}
            {campaigns.map(c => {
              const enrolled = enrollmentsByCampaign[c.id] || [];
              const active = enrolled.filter(e => e.status === 'active').length;
              return (
                <Card key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{c.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {TRIGGER_LABELS[c.trigger_type]}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${c.is_active ? 'border-green-300 text-green-700' : 'border-slate-300 text-slate-500'}`}>
                            {c.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        {c.description && <p className="text-sm text-slate-500 mt-1">{c.description}</p>}
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.steps?.length || 0} steps</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {active} active enrollments</span>
                          {c.last_executed && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last run {new Date(c.last_executed).toLocaleDateString()}</span>}
                        </div>
                        {/* Trigger summary */}
                        <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 inline-block">
                          {c.trigger_type === 'score_threshold' && `Score ${c.trigger_config?.score_min}–${c.trigger_config?.score_max}`}
                          {c.trigger_type === 'score_increase' && `Score increases by ${c.trigger_config?.score_increase_by}+ pts`}
                          {c.trigger_type === 'inactivity' && `No activity for ${c.trigger_config?.inactivity_days} days`}
                          {c.trigger_type === 'lead_status_change' && `Status → ${c.trigger_config?.lead_status}`}
                          {c.trigger_type === 'manual' && 'Manual enrollment'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => runNow(c)} disabled={runningId === c.id}>
                          {runningId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                          Run
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(c)}>
                          {c.is_active ? <Pause className="w-4 h-4 text-yellow-600" /> : <Play className="w-4 h-4 text-green-600" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteCampaign(c)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Enrollments tab */}
        {activeTab === 'enrollments' && (
          <div className="space-y-3">
            {enrollments.length === 0 && (
              <Card><CardContent className="py-12 text-center text-slate-400">No enrollments yet. Campaigns will auto-enroll contacts when triggered.</CardContent></Card>
            )}
            {enrollments.map(e => {
              const campaign = campaigns.find(c => c.id === e.campaign_id);
              return (
                <Card key={e.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">{e.contact_name || e.contact_email}</span>
                        <Badge variant="outline" className={`text-xs ${
                          e.status === 'active' ? 'border-green-300 text-green-700' :
                          e.status === 'completed' ? 'border-blue-300 text-blue-700' :
                          'border-slate-300 text-slate-500'
                        }`}>{e.status}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {campaign?.name} · Step {e.current_step}/{campaign?.steps?.length || '?'} ·
                        {e.next_send_date && ` Next: ${new Date(e.next_send_date).toLocaleDateString()}`}
                      </div>
                      {e.stop_reason && <div className="text-xs text-orange-600 mt-1">Stopped: {e.stop_reason}</div>}
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">
                      {e.completed_steps?.length || 0} sent
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Campaign Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Campaign' : 'New Drip Campaign'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Name & Description */}
            <div className="space-y-3">
              <Input placeholder="Campaign name" value={form.name} onChange={e => setField('name', e.target.value)} />
              <Textarea placeholder="Description (optional)" value={form.description || ''} onChange={e => setField('description', e.target.value)} rows={2} className="resize-none" />
            </div>

            {/* Trigger type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Trigger Type</label>
              <Select value={form.trigger_type} onValueChange={v => setField('trigger_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">{TRIGGER_DESCRIPTIONS[form.trigger_type]}</p>
            </div>

            {/* Trigger config */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
              <label className="text-sm font-medium text-slate-700">Trigger Configuration</label>

              {form.trigger_type === 'score_threshold' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Min Score</label>
                    <Input type="number" min={0} max={100} value={form.trigger_config.score_min || 0}
                      onChange={e => setTrigger('score_min', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Max Score</label>
                    <Input type="number" min={0} max={100} value={form.trigger_config.score_max || 100}
                      onChange={e => setTrigger('score_max', parseInt(e.target.value))} />
                  </div>
                </div>
              )}

              {form.trigger_type === 'score_increase' && (
                <div>
                  <label className="text-xs text-slate-500">Score must increase by (points)</label>
                  <Input type="number" min={1} value={form.trigger_config.score_increase_by || 10}
                    onChange={e => setTrigger('score_increase_by', parseInt(e.target.value))} />
                </div>
              )}

              {form.trigger_type === 'inactivity' && (
                <div>
                  <label className="text-xs text-slate-500">Days without any interaction</label>
                  <Input type="number" min={1} value={form.trigger_config.inactivity_days || 14}
                    onChange={e => setTrigger('inactivity_days', parseInt(e.target.value))} />
                </div>
              )}

              {form.trigger_type === 'lead_status_change' && (
                <div>
                  <label className="text-xs text-slate-500">Target lead status</label>
                  <Select value={form.trigger_config.lead_status || 'assigned'} onValueChange={v => setTrigger('lead_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['unassigned','assigned','contacted','qualified','active','closed_won','closed_lost'].map(s => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.trigger_type !== 'manual' && (
                <div>
                  <label className="text-xs text-slate-500">Contact type filter</label>
                  <Select value={form.trigger_config.contact_type || 'any'} onValueChange={v => setTrigger('contact_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any contact type</SelectItem>
                      <SelectItem value="buyer">Buyers only</SelectItem>
                      <SelectItem value="seller">Sellers only</SelectItem>
                      <SelectItem value="lender">Lenders only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Options</label>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Stop when contact replies</span>
                <Switch checked={form.stop_on_reply} onCheckedChange={v => setField('stop_on_reply', v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Stop when lead stage changes</span>
                <Switch checked={form.stop_on_stage_change} onCheckedChange={v => setField('stop_on_stage_change', v)} />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Sequence Steps</label>
              <DripSequenceBuilder
                steps={form.steps || []}
                onChange={(steps) => setField('steps', steps)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={save} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {saving ? 'Saving…' : editing ? 'Update Campaign' : 'Create Campaign'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}