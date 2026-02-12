import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

const SEGMENT_FIELDS = [
  { value: 'lead_score', label: 'Lead Score' },
  { value: 'status', label: 'Status' },
  { value: 'contact_type', label: 'Contact Type' },
  { value: 'market_id', label: 'Market' },
  { value: 'tags', label: 'Tags' },
  { value: 'assigned_agent_email', label: 'Assigned Agent' },
  { value: 'company', label: 'Company' },
  { value: 'last_interaction_date', label: 'Last Interaction' },
];

const OPERATORS = {
  lead_score: ['greater_than', 'less_than', 'equals', 'between'],
  status: ['equals', 'in'],
  contact_type: ['equals', 'in'],
  market_id: ['equals', 'in'],
  tags: ['contains', 'in'],
  assigned_agent_email: ['equals'],
  company: ['equals', 'contains'],
  last_interaction_date: ['date_after', 'date_before'],
};

export default function ContactSegmentBuilder({ segment, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(segment || {
    name: '',
    description: '',
    criteria: [],
    is_dynamic: true
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      segment?.id
        ? base44.entities.ContactSegment.update(segment.id, data)
        : base44.entities.ContactSegment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactSegments'] });
      onSuccess?.();
    }
  });

  const handleAddCriteria = () => {
    setFormData({
      ...formData,
      criteria: [...formData.criteria, { field: 'lead_score', operator: 'greater_than', value: '' }]
    });
  };

  const handleRemoveCriteria = (index) => {
    setFormData({
      ...formData,
      criteria: formData.criteria.filter((_, i) => i !== index)
    });
  };

  const handleCriteriaChange = (index, field, value) => {
    const newCriteria = [...formData.criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setFormData({ ...formData, criteria: newCriteria });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const renderValueInput = (criteria, index) => {
    const fieldType = criteria.field;

    if (fieldType === 'status') {
      return (
        <Select value={criteria.value} onValueChange={(v) => handleCriteriaChange(index, 'value', v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (fieldType === 'contact_type') {
      return (
        <Select value={criteria.value} onValueChange={(v) => handleCriteriaChange(index, 'value', v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buyer">Buyer</SelectItem>
            <SelectItem value="seller">Seller</SelectItem>
            <SelectItem value="lender">Lender</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (fieldType === 'market_id') {
      return (
        <Select value={criteria.value} onValueChange={(v) => handleCriteriaChange(index, 'value', v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {markets.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (fieldType === 'lead_score') {
      return (
        <Input
          type="number"
          value={criteria.value}
          onChange={(e) => handleCriteriaChange(index, 'value', e.target.value)}
          placeholder="0-100"
          min="0"
          max="100"
        />
      );
    }

    if (fieldType === 'last_interaction_date') {
      return (
        <Input
          type="date"
          value={criteria.value}
          onChange={(e) => handleCriteriaChange(index, 'value', e.target.value)}
        />
      );
    }

    return (
      <Input
        value={criteria.value}
        onChange={(e) => handleCriteriaChange(index, 'value', e.target.value)}
        placeholder="Enter value"
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{segment ? 'Edit' : 'Create'} Segment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Segment Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hot Leads Austin"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this segment for?"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Filter Criteria</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddCriteria}>
                <Plus className="w-4 h-4 mr-2" />
                Add Criterion
              </Button>
            </div>

            <div className="space-y-3">
              {formData.criteria.map((criteria, idx) => (
                <div key={idx} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg border">
                  <div className="flex-1">
                    <Label className="text-xs">Field</Label>
                    <Select value={criteria.field} onValueChange={(v) => handleCriteriaChange(idx, 'field', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENT_FIELDS.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-32">
                    <Label className="text-xs">Operator</Label>
                    <Select value={criteria.operator} onValueChange={(v) => handleCriteriaChange(idx, 'operator', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(OPERATORS[criteria.field] || []).map(op => (
                          <SelectItem key={op} value={op}>{op.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs">Value</Label>
                    {renderValueInput(criteria, idx)}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCriteria(idx)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending || formData.criteria.length === 0}>
              {mutation.isPending ? 'Saving...' : 'Save Segment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}