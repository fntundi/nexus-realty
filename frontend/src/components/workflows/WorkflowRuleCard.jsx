import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, ArrowRight, Zap, Clock } from 'lucide-react';
import { format } from 'date-fns';

const STAGE_LABELS = {
  any: 'Any Stage',
  pre_qual: 'Pre-Qual',
  showing: 'Showing',
  offer: 'Offer',
  under_contract: 'Under Contract',
  closing: 'Closing',
  closed: 'Closed',
};

const STAGE_COLORS = {
  any: 'bg-slate-100 text-slate-700',
  pre_qual: 'bg-yellow-100 text-yellow-800',
  showing: 'bg-blue-100 text-blue-800',
  offer: 'bg-purple-100 text-purple-800',
  under_contract: 'bg-orange-100 text-orange-800',
  closing: 'bg-green-100 text-green-800',
  closed: 'bg-slate-200 text-slate-700',
};

const ACTION_ICONS = {
  create_task: '📋',
  generate_checklist: '✅',
  send_notification: '🔔',
  send_email: '📧',
};

export default function WorkflowRuleCard({ rule, onEdit, onDelete, onToggle }) {
  return (
    <Card className={`border transition-all ${rule.is_active ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-60'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900 truncate">{rule.name}</h3>
              {!rule.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
            </div>

            {/* Stage transition */}
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`text-xs font-medium ${STAGE_COLORS[rule.from_stage]}`}>
                {STAGE_LABELS[rule.from_stage] || rule.from_stage}
              </Badge>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <Badge className={`text-xs font-medium ${STAGE_COLORS[rule.to_stage]}`}>
                {STAGE_LABELS[rule.to_stage] || rule.to_stage}
              </Badge>
            </div>

            {/* Description */}
            {rule.description && (
              <p className="text-sm text-slate-500 mb-3">{rule.description}</p>
            )}

            {/* Actions summary */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(rule.actions || []).map((action, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  {ACTION_ICONS[action.action_type] || '⚡'} {action.title ? action.title.slice(0, 30) + (action.title.length > 30 ? '…' : '') : action.action_type.replace(/_/g, ' ')}
                </span>
              ))}
              {(!rule.actions || rule.actions.length === 0) && (
                <span className="text-xs text-slate-400 italic">No actions configured</span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {rule.execution_count || 0} executions
              </span>
              {rule.last_executed && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last: {format(new Date(rule.last_executed), 'MMM d, h:mm a')}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => onEdit(rule)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(rule.id)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
            <Switch checked={rule.is_active} onCheckedChange={() => onToggle(rule)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}