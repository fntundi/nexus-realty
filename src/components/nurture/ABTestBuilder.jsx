import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Zap, BarChart3 } from 'lucide-react';

export default function ABTestBuilder({ step, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [variantToEdit, setVariantToEdit] = useState(null);
  const [formData, setFormData] = useState({
    variant_id: '',
    split_percentage: 50,
    subject_override: '',
    body_override: ''
  });

  const abTest = step.ab_test || { enabled: false, variants: [], winning_metric: 'click_rate' };

  const handleToggleABTest = () => {
    onUpdate({
      ...step,
      ab_test: {
        ...abTest,
        enabled: !abTest.enabled
      }
    });
  };

  const handleAddVariant = () => {
    const variantId = String.fromCharCode(65 + (abTest.variants?.length || 0));
    const newVariant = {
      variant_id: variantId,
      split_percentage: formData.split_percentage,
      subject_override: formData.subject_override,
      body_override: formData.body_override,
      sent_count: 0,
      open_count: 0,
      click_count: 0,
      conversion_count: 0
    };

    onUpdate({
      ...step,
      ab_test: {
        ...abTest,
        variants: variantToEdit
          ? abTest.variants.map(v => v.variant_id === variantToEdit.variant_id ? newVariant : v)
          : [...(abTest.variants || []), newVariant]
      }
    });

    setFormData({ variant_id: '', split_percentage: 50, subject_override: '', body_override: '' });
    setVariantToEdit(null);
    setShowDialog(false);
  };

  const handleDeleteVariant = (variantId) => {
    onUpdate({
      ...step,
      ab_test: {
        ...abTest,
        variants: abTest.variants.filter(v => v.variant_id !== variantId)
      }
    });
  };

  const calculateRates = (variant) => {
    if (!variant.sent_count) return { openRate: 0, clickRate: 0 };
    return {
      openRate: ((variant.open_count / variant.sent_count) * 100).toFixed(1),
      clickRate: ((variant.click_count / variant.sent_count) * 100).toFixed(1),
      conversionRate: ((variant.conversion_count / variant.sent_count) * 100).toFixed(1)
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4" />
          A/B Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={abTest.enabled}
              onChange={handleToggleABTest}
              className="rounded border-slate-300"
              id="ab-enabled"
            />
            <label htmlFor="ab-enabled" className="text-sm font-medium text-slate-900 cursor-pointer">
              Enable A/B Testing
            </label>
          </div>
        </div>

        {abTest.enabled && (
          <>
            <div className="space-y-2">
              <Label>Winning Metric</Label>
              <Select
                value={abTest.winning_metric || 'click_rate'}
                onValueChange={(value) =>
                  onUpdate({
                    ...step,
                    ab_test: { ...abTest, winning_metric: value }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_rate">Open Rate</SelectItem>
                  <SelectItem value="click_rate">Click Rate</SelectItem>
                  <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {abTest.variants && abTest.variants.length > 0 ? (
              <div className="space-y-3">
                {abTest.variants.map(variant => {
                  const rates = calculateRates(variant);
                  return (
                    <div key={variant.variant_id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge className="mb-2 bg-blue-600">Variant {variant.variant_id}</Badge>
                          <p className="text-sm font-medium text-slate-900">{variant.split_percentage}% split</p>
                          {variant.sent_count > 0 && (
                            <div className="text-xs text-slate-600 mt-2 space-y-1">
                              <p>Sent: {variant.sent_count} | Opens: {rates.openRate}% | Clicks: {rates.clickRate}%</p>
                              {variant.conversion_count > 0 && <p>Conversions: {rates.conversionRate}%</p>}
                            </div>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteVariant(variant.variant_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No variants added yet</p>
            )}

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create A/B Test Variant</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="split" className="w-full py-4">
                  <TabsList>
                    <TabsTrigger value="split">Split %</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                  </TabsList>

                  <TabsContent value="split" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Split Percentage</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.split_percentage}
                          onChange={(e) => setFormData({ ...formData, split_percentage: parseInt(e.target.value) })}
                        />
                        <span className="text-sm text-slate-600">{formData.split_percentage}%</span>
                      </div>
                      <p className="text-xs text-slate-500">Percentage of recipients for this variant</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="content" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject Line (Override)</Label>
                      <Input
                        placeholder="Leave blank to use default subject"
                        value={formData.subject_override}
                        onChange={(e) => setFormData({ ...formData, subject_override: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Body (Override)</Label>
                      <Textarea
                        placeholder="Leave blank to use default body"
                        value={formData.body_override}
                        onChange={(e) => setFormData({ ...formData, body_override: e.target.value })}
                        rows={5}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddVariant}>
                    {variantToEdit ? 'Update' : 'Add'} Variant
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}