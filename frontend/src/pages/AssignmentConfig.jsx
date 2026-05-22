import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function AssignmentConfig() {
  const queryClient = useQueryClient();

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [weights, setWeights] = useState({
    territory_weight: 0.25,
    workload_weight: 0.2,
    rotation_weight: 0.15,
    success_rate_weight: 0.2,
    property_performance_weight: 0.1,
    lead_source_weight: 0.1
  });

  const selectedMarket = markets.find(m => m.id === selectedMarketId);

  React.useEffect(() => {
    if (selectedMarket?.assignment_rules) {
      setWeights({
        territory_weight: selectedMarket.assignment_rules.territory_weight || 0.25,
        workload_weight: selectedMarket.assignment_rules.workload_weight || 0.2,
        rotation_weight: selectedMarket.assignment_rules.rotation_weight || 0.15,
        success_rate_weight: selectedMarket.assignment_rules.success_rate_weight || 0.2,
        property_performance_weight: selectedMarket.assignment_rules.property_performance_weight || 0.1,
        lead_source_weight: selectedMarket.assignment_rules.lead_source_weight || 0.1
      });
    } else {
      setWeights({
        territory_weight: 0.25,
        workload_weight: 0.2,
        rotation_weight: 0.15,
        success_rate_weight: 0.2,
        property_performance_weight: 0.1,
        lead_source_weight: 0.1
      });
    }
  }, [selectedMarket]);

  const updateMarketMutation = useMutation({
    mutationFn: async (rules) => {
      return base44.entities.Market.update(selectedMarketId, {
        assignment_rules: rules
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      toast.success('Assignment rules updated');
    }
  });

  const handleWeightChange = (key, value) => {
    setWeights(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleSave = () => {
    // Normalize weights to sum to 1
    const total = Object.values(weights).reduce((sum, val) => sum + val, 0);
    const normalized = {};
    Object.keys(weights).forEach(key => {
      normalized[key] = weights[key] / total;
    });

    updateMarketMutation.mutate(normalized);
  };

  const totalWeight = Object.values(weights).reduce((sum, val) => sum + val, 0);
  const isNormalized = Math.abs(totalWeight - 1) < 0.01;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assignment Configuration</h1>
          <p className="text-slate-600 mt-1">Configure auto-assignment rules for your markets</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Select Market
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a market..." />
              </SelectTrigger>
              <SelectContent>
                {markets.map(market => (
                  <SelectItem key={market.id} value={market.id}>
                    {market.name} ({market.state})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedMarketId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Assignment Algorithm Weights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-900">
                Configure how leads are automatically assigned to agents. Adjust the importance of each factor.
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Territory Match</Label>
                    <span className="text-sm font-medium text-slate-700">
                      {(weights.territory_weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[weights.territory_weight]}
                    onValueChange={(v) => handleWeightChange('territory_weight', v)}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-600">
                    Prioritize agents who cover the lead's preferred areas or zip codes
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Workload & Capacity</Label>
                    <span className="text-sm font-medium text-slate-700">
                      {(weights.workload_weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[weights.workload_weight]}
                    onValueChange={(v) => handleWeightChange('workload_weight', v)}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-600">
                    Balance load across agents based on active leads and deal complexity
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Fair Rotation</Label>
                    <span className="text-sm font-medium text-slate-700">
                      {(weights.rotation_weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[weights.rotation_weight]}
                    onValueChange={(v) => handleWeightChange('rotation_weight', v)}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-600">
                    Ensure fair distribution by favoring agents with fewer total assignments
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Success Rate</Label>
                    <span className="text-sm font-medium text-slate-700">
                      {(weights.success_rate_weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[weights.success_rate_weight]}
                    onValueChange={(v) => handleWeightChange('success_rate_weight', v)}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-600">
                    Consider agent's overall conversion rate and closing performance
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Property Performance</Label>
                    <span className="text-sm font-medium text-slate-700">
                      {((weights.property_performance_weight || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[weights.property_performance_weight || 0]}
                    onValueChange={(v) => handleWeightChange('property_performance_weight', v)}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-600">
                    Match leads to agents with proven success in similar property types and price ranges
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Lead Source Effectiveness</Label>
                    <span className="text-sm font-medium text-slate-700">
                      {((weights.lead_source_weight || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[weights.lead_source_weight || 0]}
                    onValueChange={(v) => handleWeightChange('lead_source_weight', v)}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-600">
                    Prioritize agents with high conversion rates from specific lead sources
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Total Weight</div>
                    <div className={`text-xs mt-1 ${isNormalized ? 'text-green-600' : 'text-orange-600'}`}>
                      {isNormalized 
                        ? '✓ Weights are balanced' 
                        : `⚠ Weights will be normalized (current: ${(totalWeight * 100).toFixed(0)}%)`
                      }
                    </div>
                  </div>
                  <Button 
                    onClick={handleSave}
                    disabled={updateMarketMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMarketMutation.isPending ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}