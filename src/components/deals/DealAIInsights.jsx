import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Zap, MessageSquare, Loader2 } from 'lucide-react';

export default function DealAIInsights({ transactionId }) {
  const [generatingMessage, setGeneratingMessage] = useState(null);
  const [outreachMessage, setOutreachMessage] = useState(null);

  const { data: analysis, isLoading: analysisLoading, error: analysisError } = useQuery({
    queryKey: ['dealAnalysis', transactionId],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeDeal', {
        transactionId
      });
      return response.data;
    },
    staleTime: 10 * 60 * 1000 // Cache for 10 minutes
  });

  const handleGenerateMessage = async (messageType) => {
    setGeneratingMessage(messageType);
    try {
      const response = await base44.functions.invoke('generateOutreachMessage', {
        transactionId,
        messageType
      });
      setOutreachMessage(response.data);
    } catch (err) {
      console.error('Error generating message:', err);
    } finally {
      setGeneratingMessage(null);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Hot Prospect': 'bg-red-100 text-red-800',
      'Warm Lead': 'bg-orange-100 text-orange-800',
      'Cold Lead': 'bg-slate-100 text-slate-800',
      'High-Value': 'bg-purple-100 text-purple-800',
      'Standard': 'bg-blue-100 text-blue-800'
    };
    return colors[category] || 'bg-slate-100 text-slate-800';
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 75) return 'text-green-600 bg-green-50';
    if (probability >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  if (analysisLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (analysisError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-6 text-red-700">
          Error loading AI analysis
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Deal Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Deal Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">Deal Category</label>
            <div className="mt-1">
              <Badge className={getCategoryColor(analysis.category)}>
                {analysis.category}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Closing Probability
            </label>
            <div className={`mt-2 p-4 rounded-lg ${getProbabilityColor(analysis.closingProbability)}`}>
              <div className="text-3xl font-bold">{analysis.closingProbability}%</div>
              <p className="text-sm mt-1">Likelihood of deal closing</p>
            </div>
          </div>

          {analysis.riskFactors && analysis.riskFactors.length > 0 && (
            <div>
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Risk Factors
              </label>
              <div className="mt-2 space-y-2">
                {analysis.riskFactors.map((risk, idx) => (
                  <div key={idx} className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                    • {risk}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Next Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.nextActions?.map((action, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-900">{action}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Insights */}
      {analysis.timelineInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{analysis.timelineInsights}</p>
          </CardContent>
        </Card>
      )}

      {/* Outreach Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            AI-Generated Outreach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {['follow_up', 'check_in', 'next_steps'].map(messageType => (
              <Button
                key={messageType}
                variant="outline"
                size="sm"
                onClick={() => handleGenerateMessage(messageType)}
                disabled={generatingMessage === messageType}
              >
                {generatingMessage === messageType ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  messageType.replace(/_/g, ' ')
                )}
              </Button>
            ))}
          </div>

          {outreachMessage && (
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">SUBJECT</label>
                <p className="text-sm text-slate-900 mt-1 p-2 bg-slate-50 rounded">
                  {outreachMessage.subject}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">MESSAGE</label>
                <p className="text-sm text-slate-700 mt-1 p-3 bg-slate-50 rounded whitespace-pre-wrap">
                  {outreachMessage.message}
                </p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Use This Message
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}