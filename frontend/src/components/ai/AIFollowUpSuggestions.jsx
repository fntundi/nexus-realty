import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AIFollowUpSuggestions({ contact, interactions, lead }) {
  const [suggestions, setSuggestions] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const prompt = `You are an AI assistant for real estate agents. Analyze this client profile and suggest optimal follow-up strategies.

Contact Information:
- Name: ${contact.first_name} ${contact.last_name}
- Type: ${contact.contact_type}
- Status: ${contact.status}
- Lead Score: ${contact.lead_score || 0}/100
- Last Interaction: ${contact.last_interaction_date || 'Never'}

Recent Interactions (${interactions?.length || 0} total):
${interactions?.slice(0, 5).map(i => `- ${i.interaction_type}: ${i.subject} (${i.interaction_date})`).join('\n') || 'No recent interactions'}

Lead Details:
${lead ? `- Source: ${lead.source}
- Status: ${lead.status}
- Budget: $${lead.budget_min || 0} - $${lead.budget_max || 0}` : 'No active lead'}

Based on this information, provide:
1. Optimal follow-up timing (best day/time)
2. Recommended communication channel (call, email, text)
3. Suggested talking points or topics to discuss
4. Priority level (low, medium, high, urgent)

Format as JSON.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            optimal_timing: {
              type: "object",
              properties: {
                best_day: { type: "string" },
                best_time: { type: "string" },
                reasoning: { type: "string" }
              }
            },
            communication_channel: {
              type: "object",
              properties: {
                primary: { type: "string" },
                secondary: { type: "string" },
                reasoning: { type: "string" }
              }
            },
            talking_points: {
              type: "array",
              items: { type: "string" }
            },
            priority: { type: "string" },
            overall_strategy: { type: "string" }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      setSuggestions(data);
      toast.success('AI suggestions generated');
    },
    onError: () => {
      toast.error('Failed to generate suggestions');
    }
  });

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Follow-Up Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!suggestions ? (
          <div className="text-center py-6">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-300" />
            <p className="text-slate-600 mb-4">
              Get AI-powered suggestions for optimal follow-up timing and communication strategies
            </p>
            <Button 
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Priority Level:</span>
              <Badge className={getPriorityColor(suggestions.priority)}>
                {suggestions.priority?.toUpperCase()}
              </Badge>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 mb-1">Best Time to Follow Up</p>
                  <p className="text-sm text-blue-800">
                    <strong>{suggestions.optimal_timing?.best_day}</strong> at <strong>{suggestions.optimal_timing?.best_time}</strong>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">{suggestions.optimal_timing?.reasoning}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 mb-1">Recommended Channel</p>
                  <p className="text-sm text-green-800">
                    Primary: <strong>{suggestions.communication_channel?.primary}</strong>
                    {suggestions.communication_channel?.secondary && (
                      <>, Backup: <strong>{suggestions.communication_channel?.secondary}</strong></>
                    )}
                  </p>
                  <p className="text-xs text-green-700 mt-1">{suggestions.communication_channel?.reasoning}</p>
                </div>
              </div>
            </div>

            {suggestions.talking_points?.length > 0 && (
              <div>
                <p className="font-medium text-slate-900 mb-2">Suggested Talking Points:</p>
                <ul className="space-y-1">
                  {suggestions.talking_points.map((point, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-purple-600">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.overall_strategy && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="font-medium text-purple-900 mb-1">Strategy Overview</p>
                <p className="text-sm text-purple-800">{suggestions.overall_strategy}</p>
              </div>
            )}

            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => generateMutation.mutate()}
            >
              Refresh Suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}