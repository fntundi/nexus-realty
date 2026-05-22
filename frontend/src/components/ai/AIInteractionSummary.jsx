import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, TrendingUp, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { callAIWithProtection } from '@/lib/aiCircuitBreaker';

export default function AIInteractionSummary({ contact, interactions, transactions }) {
  const [summary, setSummary] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const prompt = `You are an AI assistant for real estate agents. Provide a concise but comprehensive summary of this client's history.

Contact: ${contact.first_name} ${contact.last_name}
Type: ${contact.contact_type}
Lead Score: ${contact.lead_score || 0}/100

Interaction History (${interactions?.length || 0} interactions):
${interactions?.map(i => `- ${i.interaction_date}: ${i.interaction_type} - ${i.subject}\n  Outcome: ${i.outcome || 'N/A'}`).join('\n') || 'No interactions'}

Transaction History:
${transactions?.map(t => `- Stage: ${t.current_stage}, Status: ${t.status}`).join('\n') || 'No transactions'}

Provide:
1. A brief overview of the client relationship (2-3 sentences)
2. Key milestones and important moments
3. Client preferences and patterns you've noticed
4. Current status and next steps recommendation
5. Any red flags or concerns

Keep it concise and actionable for a busy agent.`;

      // Use circuit breaker and retry logic
      const result = await callAIWithProtection(
        () => base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              relationship_overview: { type: "string" },
              key_milestones: { type: "array", items: { type: "string" } },
              client_preferences: { type: "array", items: { type: "string" } },
              current_status: { type: "string" },
              next_steps: { type: "string" },
              concerns: { type: "array", items: { type: "string" } }
            }
          }
        }),
        {
          timeout: 30000,
          maxRetries: 2,
          fallback: () => ({
            relationship_overview: 'Unable to generate summary at this time. Please try again.',
            key_milestones: [],
            client_preferences: [],
            current_status: 'Analysis unavailable',
            next_steps: 'Retry generation',
            concerns: []
          })
        }
      );

      return result;
    },
    onSuccess: (data) => {
      setSummary(data);
      toast.success('Summary generated');
    },
    onError: () => {
      toast.error('Failed to generate summary');
    }
  });

  useEffect(() => {
    if (interactions?.length > 0 && !summary) {
      generateMutation.mutate();
    }
  }, [interactions]);

  if (generateMutation.isPending) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-600" />
          <p className="text-slate-600">Generating AI summary...</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-300" />
          <p className="text-slate-600 mb-4">Generate an AI-powered summary of client history</p>
          <Button onClick={() => generateMutation.mutate()}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Summary
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Client Summary
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => generateMutation.mutate()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-slate-600" />
            <h4 className="font-semibold text-slate-900">Relationship Overview</h4>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{summary.relationship_overview}</p>
        </div>

        {summary.key_milestones?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <h4 className="font-semibold text-slate-900">Key Milestones</h4>
            </div>
            <ul className="space-y-1">
              {summary.key_milestones.map((milestone, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>{milestone}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.client_preferences?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h4 className="font-semibold text-slate-900">Client Preferences & Patterns</h4>
            </div>
            <ul className="space-y-1">
              {summary.client_preferences.map((pref, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{pref}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-1">Current Status</h4>
          <p className="text-sm text-blue-800">{summary.current_status}</p>
        </div>

        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-1">Recommended Next Steps</h4>
          <p className="text-sm text-green-800">{summary.next_steps}</p>
        </div>

        {summary.concerns?.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-900 mb-2">Points to Watch</h4>
            <ul className="space-y-1">
              {summary.concerns.map((concern, idx) => (
                <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="text-amber-600">⚠</span>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}