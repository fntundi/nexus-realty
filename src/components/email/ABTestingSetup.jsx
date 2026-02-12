import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

export default function ABTestingSetup({ sequenceId, onSuccess }) {
  const queryClient = useQueryClient();
  const [variantType, setVariantType] = useState('subject_line');
  const [splitPercentage, setSplitPercentage] = useState([50]);
  const [variantA, setVariantA] = useState({ subject: '', body: '' });
  const [variantB, setVariantB] = useState({ subject: '', body: '' });

  const { data: template } = useQuery({
    queryKey: ['sequenceTemplate', sequenceId],
    queryFn: async () => {
      const seq = await base44.entities.EmailSequence.get(sequenceId);
      if (seq?.emails?.[0]?.template_id) {
        return base44.entities.EmailTemplate.get(seq.emails[0].template_id);
      }
      return null;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (variants) => {
      await Promise.all(variants.map(v => base44.entities.EmailSequenceVariant.create(v)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailVariants'] });
      onSuccess?.();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const variants = [
      {
        sequence_id: sequenceId,
        template_id: template?.id,
        variant_type: variantType,
        variant_letter: 'A',
        split_percentage: 100 - splitPercentage[0],
        subject_override: variantA.subject || template?.subject,
        body_override: variantA.body || template?.body
      },
      {
        sequence_id: sequenceId,
        template_id: template?.id,
        variant_type: variantType,
        variant_letter: 'B',
        split_percentage: splitPercentage[0],
        subject_override: variantB.subject || template?.subject,
        body_override: variantB.body || template?.body
      }
    ];

    createMutation.mutate(variants);
  };

  if (!template) {
    return <div className="text-slate-600">Loading template...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup A/B Test</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Test Type</Label>
            <Select value={variantType} onValueChange={setVariantType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subject_line">Subject Line Only</SelectItem>
                <SelectItem value="content">Content Only</SelectItem>
                <SelectItem value="both">Subject & Content</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Traffic Split</Label>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex-1">
                <Slider
                  value={splitPercentage}
                  onValueChange={setSplitPercentage}
                  min={10}
                  max={90}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="w-24 text-right">
                <p className="text-sm font-semibold">A: {100 - splitPercentage[0]}% / B: {splitPercentage[0]}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Variant A */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h3 className="font-semibold text-slate-900">Variant A</h3>
              {(variantType === 'subject_line' || variantType === 'both') && (
                <div>
                  <Label className="text-xs">Subject Line</Label>
                  <Input
                    value={variantA.subject}
                    onChange={(e) => setVariantA({ ...variantA, subject: e.target.value })}
                    placeholder={template?.subject}
                  />
                </div>
              )}
              {(variantType === 'content' || variantType === 'both') && (
                <div>
                  <Label className="text-xs">Body Preview</Label>
                  <Textarea
                    value={variantA.body}
                    onChange={(e) => setVariantA({ ...variantA, body: e.target.value })}
                    placeholder={template?.body}
                    className="h-20 text-xs"
                  />
                </div>
              )}
              {!variantA.subject && !variantA.body && (
                <p className="text-xs text-slate-600">Using original template</p>
              )}
            </div>

            {/* Variant B */}
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <h3 className="font-semibold text-slate-900">Variant B</h3>
              {(variantType === 'subject_line' || variantType === 'both') && (
                <div>
                  <Label className="text-xs">Subject Line</Label>
                  <Input
                    value={variantB.subject}
                    onChange={(e) => setVariantB({ ...variantB, subject: e.target.value })}
                    placeholder={template?.subject}
                  />
                </div>
              )}
              {(variantType === 'content' || variantType === 'both') && (
                <div>
                  <Label className="text-xs">Body Preview</Label>
                  <Textarea
                    value={variantB.body}
                    onChange={(e) => setVariantB({ ...variantB, body: e.target.value })}
                    placeholder={template?.body}
                    className="h-20 text-xs"
                  />
                </div>
              )}
              {!variantB.subject && !variantB.body && (
                <p className="text-xs text-slate-600">Using original template</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating Variants...' : 'Create A/B Test'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}