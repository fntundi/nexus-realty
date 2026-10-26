import React from 'react';
import { Check } from 'lucide-react';
import { format } from 'date-fns';

const STAGES = [
  { key: 'pre_qual', label: 'Pre-Qualification', hint: 'Buyer is getting pre-approved' },
  { key: 'showing', label: 'Showings', hint: 'Touring homes' },
  { key: 'offer', label: 'Offer', hint: 'Offer is being negotiated' },
  { key: 'under_contract', label: 'Under Contract', hint: 'Inspection, appraisal and underwriting' },
  { key: 'closing', label: 'Closing', hint: 'Final documents and signing' },
  { key: 'closed', label: 'Closed', hint: 'Keys handed over' },
];

export default function DealStageTimeline({ transaction }) {
  const currentIdx = STAGES.findIndex((s) => s.key === transaction.current_stage);
  const history = transaction.stage_history || [];

  return (
    <ol className="space-y-4">
      {STAGES.map((stage, i) => {
        const done = i < currentIdx || transaction.current_stage === 'closed';
        const current = i === currentIdx && transaction.current_stage !== 'closed';
        const entered = history.find((h) => h.stage === stage.key)?.entered_date;
        return (
          <li key={stage.key} className="flex gap-3">
            <div
              className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                done ? 'bg-green-600 text-white' : current ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div>
              <p className={`text-sm font-medium ${current ? 'text-blue-700' : 'text-slate-900'}`}>
                {stage.label}
                {current && <span className="ml-2 text-xs font-normal text-blue-600">Current</span>}
              </p>
              <p className="text-xs text-slate-500">
                {stage.hint}
                {entered && ` · ${format(new Date(entered), 'MMM d, yyyy')}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}