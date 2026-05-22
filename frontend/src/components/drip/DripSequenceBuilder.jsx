import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Mail, MessageSquare, Bell, ChevronDown, ChevronUp } from 'lucide-react';

const CHANNEL_ICONS = {
  email: <Mail className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  notification: <Bell className="w-4 h-4" />,
};

const CHANNEL_COLORS = {
  email: 'bg-blue-100 text-blue-700 border-blue-200',
  sms: 'bg-green-100 text-green-700 border-green-200',
  notification: 'bg-purple-100 text-purple-700 border-purple-200',
};

const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{lead_score}}', '{{property_address}}', '{{agent_name}}'];

export default function DripSequenceBuilder({ steps, onChange }) {
  const addStep = () => {
    const last = steps[steps.length - 1];
    onChange([...steps, {
      step_number: steps.length + 1,
      delay_days: last ? 3 : 0,
      channel: 'email',
      subject: '',
      message: '',
    }]);
  };

  const removeStep = (idx) => {
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
    onChange(updated);
  };

  const updateStep = (idx, field, value) => {
    const updated = steps.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    onChange(updated);
  };

  const moveStep = (idx, dir) => {
    const arr = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr.map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  return (
    <div className="space-y-3">
      {steps.length === 0 && (
        <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-xl text-sm">
          No steps yet — add your first message below
        </div>
      )}

      {steps.map((step, idx) => (
        <div key={idx} className="border rounded-xl p-4 bg-white space-y-3">
          {/* Step header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {step.step_number}
            </span>

            <div className="flex items-center gap-1.5">
              {CHANNEL_ICONS[step.channel]}
              <Select value={step.channel} onValueChange={(v) => updateStep(idx, 'channel', v)}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="notification">In-App</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Send after</span>
              <Input
                type="number" min={0}
                value={step.delay_days}
                onChange={(e) => updateStep(idx, 'delay_days', parseInt(e.target.value) || 0)}
                className="h-7 w-16 text-xs"
              />
              <span>day{step.delay_days !== 1 ? 's' : ''}</span>
              {idx === 0 && <span className="text-slate-400">(from trigger)</span>}
            </div>

            <div className="ml-auto flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}>
                <ChevronDown className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => removeStep(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Subject (email only) */}
          {step.channel === 'email' && (
            <Input
              placeholder="Email subject — e.g. Hi {{first_name}}, still looking?"
              value={step.subject}
              onChange={(e) => updateStep(idx, 'subject', e.target.value)}
              className="text-sm"
            />
          )}

          {/* Message */}
          <Textarea
            placeholder={step.channel === 'sms' ? 'SMS message (160 chars ideal)' : 'Message body…'}
            value={step.message}
            onChange={(e) => updateStep(idx, 'message', e.target.value)}
            rows={step.channel === 'sms' ? 2 : 4}
            className="text-sm resize-none"
          />

          {/* Variable chips */}
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-slate-400 mr-1">Insert:</span>
            {VARIABLES.map(v => (
              <button
                key={v}
                onClick={() => updateStep(idx, 'message', (step.message || '') + v)}
                className="text-xs px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addStep} className="w-full">
        <Plus className="w-4 h-4 mr-2" /> Add Step
      </Button>
    </div>
  );
}