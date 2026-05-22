import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Zap, Lightbulb, Loader } from 'lucide-react';
import { toast } from 'sonner';
import FactorContributionChart from './FactorContributionChart';
import ConversionPredictionAnalytics from './ConversionPredictionAnalytics';

export default function LeadScoringModelBuilder() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [industry, setIndustry] = useState('Real Estate');
  const [businessGoals, setBusinessGoals] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scoring_factors: [],
    recalculation_frequency: 'daily'
  });

  const { data: models = [] } = useQuery({
    queryKey: ['lead-scoring-models'],
    queryFn: () => base44.entities.LeadScoringModel.list()
  });

  const suggestFactorsMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('suggestScoringFactors', {
        industry,
        business_goals: businessGoals,
        existing_factors: formData.scoring_factors
      }),
    onSuccess: (response) => {
      if (response.data?.suggested_factors) {
        toast.success(`${response.data.suggested_factors.length} factors suggested`);
      }
    }
  });

  const analyzeConversionMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('analyzeConversionLikelihood', {
        model_id: editingId,
        lead_score: calculateTotalScore(),
        contact_data: {}
      }),
    onSuccess: (response) => {
      if (response.data?.success) {
        setAnalyticsData(response.data);
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadScoringModel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-models'] });
      resetForm();
      toast.success('Scoring model created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadScoringModel.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-models'] });
      resetForm();
      toast.success('Scoring model updated');
    }
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      scoring_factors: [],
      recalculation_frequency: 'daily'
    });
  };

  const addFactor = () => {
    const newFactor = {
      factor_id: `factor-${Date.now()}`,
      factor_name: '',
      factor_type: 'behavioral',
      field_name: '',
      weight: 1,
      condition: { operator: 'equals', value: '' },
      points: 10
    };
    setFormData({
      ...formData,
      scoring_factors: [...formData.scoring_factors, newFactor]
    });
  };

  const removeFactor = (factorId) => {
    setFormData({
      ...formData,
      scoring_factors: formData.scoring_factors.filter(f => f.factor_id !== factorId)
    });
  };

  const updateFactor = (factorId, field, value) => {
    setFormData({
      ...formData,
      scoring_factors: formData.scoring_factors.map(f =>
        f.factor_id === factorId ? { ...f, [field]: value } : f
      )
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Model name is required');
      return;
    }
    if (formData.scoring_factors.length === 0) {
      toast.error('Add at least one scoring factor');
      return;
    }

    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const totalWeight = formData.scoring_factors.reduce((sum, f) => sum + (f.weight || 0), 0);

  const calculateTotalScore = () => {
    return formData.scoring_factors.reduce((sum, f) => sum + ((f.points || 0) * (f.weight || 1)), 0);
  };

  const addSuggestedFactors = (suggestedFactors) => {
    suggestedFactors.forEach(suggestion => {
      const newFactor = {
        factor_id: `factor-${Date.now()}-${Math.random()}`,
        factor_name: suggestion.factor_name,
        factor_type: suggestion.factor_type,
        field_name: suggestion.field_name,
        weight: suggestion.weight || 5,
        condition: {
          operator: 'equals',
          value: suggestion.condition_example?.split(': ')[1] || ''
        },
        points: suggestion.points || 10
      };
      setFormData(prev => ({
        ...prev,
        scoring_factors: [...prev.scoring_factors, newFactor]
      }));
    });
    setShowAISuggestions(false);
  };

  return (
    <div className="space-y-6">
      {/* Models List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Scoring Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <p className="text-slate-500 text-sm">No models created yet</p>
          ) : (
            <div className="space-y-2">
              {models.map(model => (
                <div
                  key={model.id}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-medium text-slate-900">{model.name}</h4>
                    <p className="text-xs text-slate-500">
                      {model.scoring_factors?.length || 0} factors
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={model.is_active ? 'default' : 'secondary'}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(model.id);
                        setFormData(model);
                        setIsCreating(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Builder */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit' : 'Create'} Scoring Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Model Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., High-Value Buyer"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Model description"
              />
            </div>

            <div className="space-y-2">
              <Label>Recalculation Frequency</Label>
              <Select
                value={formData.recalculation_frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, recalculation_frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_interaction">On Interaction</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visualizations */}
            <div className="space-y-4">
              <FactorContributionChart factors={formData.scoring_factors} />
            </div>

            {/* Scoring Factors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">Scoring Factors</h3>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-slate-600">Total Weight: {totalWeight}</span>
                  <Button size="sm" onClick={addFactor} className="gap-1">
                    <Plus className="w-3 h-3" />
                    Add Factor
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {formData.scoring_factors.map(factor => (
                  <div
                    key={factor.factor_id}
                    className="p-4 border border-slate-200 rounded-lg space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <Input
                        value={factor.factor_name}
                        onChange={(e) =>
                          updateFactor(factor.factor_id, 'factor_name', e.target.value)
                        }
                        placeholder="Factor name (e.g., Page Views)"
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFactor(factor.factor_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={factor.factor_type}
                          onValueChange={(value) =>
                            updateFactor(factor.factor_id, 'factor_type', value)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="behavioral">Behavioral</SelectItem>
                            <SelectItem value="demographic">Demographic</SelectItem>
                            <SelectItem value="engagement">Engagement</SelectItem>
                            <SelectItem value="interaction">Interaction</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Field</Label>
                        <Input
                          value={factor.field_name}
                          onChange={(e) =>
                            updateFactor(factor.factor_id, 'field_name', e.target.value)
                          }
                          placeholder="e.g., page_views"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Weight (1-10)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={factor.weight}
                          onChange={(e) =>
                            updateFactor(factor.factor_id, 'weight', parseInt(e.target.value))
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Points</Label>
                        <Input
                          type="number"
                          value={factor.points}
                          onChange={(e) =>
                            updateFactor(factor.factor_id, 'points', parseInt(e.target.value))
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Operator</Label>
                        <Select
                          value={factor.condition.operator}
                          onValueChange={(value) =>
                            updateFactor(factor.factor_id, 'condition', {
                              ...factor.condition,
                              operator: value
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="greater_than">&gt;</SelectItem>
                            <SelectItem value="less_than">&lt;</SelectItem>
                            <SelectItem value="in_range">Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={factor.condition.value}
                          onChange={(e) =>
                            updateFactor(factor.factor_id, 'condition', {
                              ...factor.condition,
                              value: e.target.value
                            })
                          }
                          placeholder="e.g., 5"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Analytics */}
            {editingId && (
              <div className="space-y-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => analyzeConversionMutation.mutate()}
                  disabled={analyzeConversionMutation.isPending}
                  className="w-full"
                >
                  {analyzeConversionMutation.isPending && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                  Analyze Conversion Likelihood
                </Button>
                <ConversionPredictionAnalytics
                  analytics={analyticsData}
                  isLoading={analyzeConversionMutation.isPending}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Update' : 'Create'} Model
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions Panel */}
      {showAISuggestions && !isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              AI Factor Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Tell me about your business to get personalized factor suggestions
            </p>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Real Estate">Real Estate</SelectItem>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Luxury">Luxury</SelectItem>
                    <SelectItem value="Investments">Investments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Business Goals</Label>
                <Input
                  value={businessGoals}
                  onChange={(e) => setBusinessGoals(e.target.value)}
                  placeholder="e.g., Increase close rate, Focus on high-value buyers"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => suggestFactorsMutation.mutate()}
                  disabled={suggestFactorsMutation.isPending}
                  className="flex-1"
                >
                  {suggestFactorsMutation.isPending && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Suggestions
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAISuggestions(false)}
                >
                  Cancel
                </Button>
              </div>

              {suggestFactorsMutation.data?.data?.suggested_factors && (
                <div className="space-y-3 pt-4 border-t">
                  {suggestFactorsMutation.data.data.suggested_factors.map((factor, idx) => (
                    <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">{factor.factor_name}</h4>
                          <p className="text-xs text-slate-600 mt-1">{factor.rationale}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addSuggestedFactors([factor])}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isCreating && (
        <div className="flex gap-2">
          <Button onClick={() => setIsCreating(true)} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Create New Model
          </Button>
          <Button variant="outline" onClick={() => setShowAISuggestions(!showAISuggestions)}>
            <Lightbulb className="w-4 h-4 mr-2" />
            AI Suggestions
          </Button>
        </div>
      )}
    </div>
  );
}