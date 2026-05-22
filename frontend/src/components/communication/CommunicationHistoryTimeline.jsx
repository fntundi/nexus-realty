import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Phone, Mail, MessageSquare, FileText, Sparkles, Loader2, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CommunicationHistoryTimeline({ interactions }) {
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summaryMode, setSummaryMode] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze this communication history and provide insights:

Communications (${interactions.length} total):
${interactions.slice(0, 20).map(i => 
  `[${format(new Date(i.interaction_date), 'MMM d, yyyy')}] ${i.interaction_type}: ${i.subject}\n${i.description || ''}\nOutcome: ${i.outcome || 'N/A'}`
).join('\n\n')}

Provide:
1. Executive summary of the relationship (2-3 sentences)
2. Key topics discussed (array of topics)
3. Communication patterns (frequency, preferred channels)
4. Important action items or follow-ups mentioned
5. Sentiment analysis (positive/neutral/negative)

Format as JSON.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            key_topics: {
              type: "array",
              items: { type: "string" }
            },
            communication_patterns: {
              type: "object",
              properties: {
                frequency: { type: "string" },
                preferred_channel: { type: "string" },
                response_rate: { type: "string" }
              }
            },
            action_items: {
              type: "array",
              items: { type: "string" }
            },
            sentiment: { type: "string" },
            engagement_level: { type: "string" }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      setAiSummary(data);
      setSummaryMode(true);
      toast.success('AI summary generated');
    },
    onError: () => {
      toast.error('Failed to generate summary');
    }
  });

  const getTypeIcon = (type) => {
    switch(type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      call: 'bg-blue-100 text-blue-800',
      email: 'bg-purple-100 text-purple-800',
      sms: 'bg-green-100 text-green-800',
      meeting: 'bg-orange-100 text-orange-800',
      note: 'bg-slate-100 text-slate-800'
    };
    return <Badge className={colors[type] || 'bg-slate-100 text-slate-800'}>{type}</Badge>;
  };

  const getOutcomeBadge = (outcome) => {
    const colors = {
      follow_up_needed: 'bg-amber-100 text-amber-800',
      action_taken: 'bg-green-100 text-green-800',
      no_action: 'bg-slate-100 text-slate-800',
      scheduled: 'bg-blue-100 text-blue-800'
    };
    return <Badge variant="outline" className={colors[outcome] || 'bg-slate-100 text-slate-800'}>
      {outcome?.replace(/_/g, ' ')}
    </Badge>;
  };

  const filteredInteractions = interactions
    .filter(i => filterType === 'all' || i.interaction_type === filterType)
    .filter(i => 
      !searchTerm || 
      i.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Communication History ({interactions.length})</CardTitle>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => summaryMode ? setSummaryMode(false) : generateSummaryMutation.mutate()}
            disabled={generateSummaryMutation.isPending}
          >
            {generateSummaryMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : summaryMode ? (
              'Show Timeline'
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Summary
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summaryMode && aiSummary ? (
          <div className="space-y-4">
            {/* Executive Summary */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Summary</h4>
              <p className="text-sm text-purple-800">{aiSummary.executive_summary}</p>
            </div>

            {/* Key Topics */}
            {aiSummary.key_topics?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Key Topics Discussed</h4>
                <div className="flex flex-wrap gap-2">
                  {aiSummary.key_topics.map((topic, idx) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-800">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Communication Patterns */}
            {aiSummary.communication_patterns && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Frequency</p>
                  <p className="font-medium text-slate-900">{aiSummary.communication_patterns.frequency}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Preferred Channel</p>
                  <p className="font-medium text-slate-900">{aiSummary.communication_patterns.preferred_channel}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Response Rate</p>
                  <p className="font-medium text-slate-900">{aiSummary.communication_patterns.response_rate}</p>
                </div>
              </div>
            )}

            {/* Action Items */}
            {aiSummary.action_items?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Action Items Mentioned</h4>
                <ul className="space-y-1">
                  {aiSummary.action_items.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-amber-600">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sentiment & Engagement */}
            <div className="flex gap-3">
              {aiSummary.sentiment && (
                <Badge className={
                  aiSummary.sentiment.toLowerCase().includes('positive') ? 'bg-green-100 text-green-800' :
                  aiSummary.sentiment.toLowerCase().includes('negative') ? 'bg-red-100 text-red-800' :
                  'bg-slate-100 text-slate-800'
                }>
                  Sentiment: {aiSummary.sentiment}
                </Badge>
              )}
              {aiSummary.engagement_level && (
                <Badge className="bg-blue-100 text-blue-800">
                  Engagement: {aiSummary.engagement_level}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search communications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call">Calls</SelectItem>
                  <SelectItem value="email">Emails</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="note">Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              {filteredInteractions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No communications found</p>
                </div>
              ) : (
                filteredInteractions.map((interaction, idx) => (
                  <div key={interaction.id} className="relative pl-8 pb-4 border-l-2 border-slate-200 last:border-l-0">
                    <div className="absolute -left-3 top-0 bg-white p-1 border-2 border-slate-200 rounded-full">
                      {getTypeIcon(interaction.interaction_type)}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-900">{interaction.subject}</h4>
                          <p className="text-xs text-slate-500">
                            {format(new Date(interaction.interaction_date), 'MMM d, yyyy h:mm a')}
                            {interaction.conducted_by && ` • by ${interaction.conducted_by}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {getTypeBadge(interaction.interaction_type)}
                          {interaction.outcome && getOutcomeBadge(interaction.outcome)}
                        </div>
                      </div>
                      {interaction.description && (
                        <p className="text-sm text-slate-700 mt-2">{interaction.description}</p>
                      )}
                      {interaction.next_step && (
                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-900">
                            <strong>Next Step:</strong> {interaction.next_step}
                          </p>
                        </div>
                      )}
                      {interaction.priority === 'high' && (
                        <Badge className="mt-2 bg-red-100 text-red-800">High Priority</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}