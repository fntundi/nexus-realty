import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DynamicContentBuilder({ content, onContentChange }) {
  const [selectedVariable, setSelectedVariable] = useState('');

  const availableVariables = [
    { key: '{{first_name}}', label: 'First Name', type: 'contact' },
    { key: '{{last_name}}', label: 'Last Name', type: 'contact' },
    { key: '{{company}}', label: 'Company', type: 'contact' },
    { key: '{{lead_score}}', label: 'Lead Score', type: 'scoring' },
    { key: '{{contact_type}}', label: 'Contact Type', type: 'contact' },
    { key: '{{days_since_interaction}}', label: 'Days Since Interaction', type: 'interaction' },
    { key: '{{last_interaction_type}}', label: 'Last Interaction Type', type: 'interaction' },
    { key: '{{property_address}}', label: 'Property Address', type: 'property' },
    { key: '{{property_price}}', label: 'Property Price', type: 'property' },
    { key: '{{market}}', label: 'Market', type: 'contact' },
    { key: '{{workflow_step_count}}', label: 'Workflow Steps Completed', type: 'workflow' },
    { key: '{{current_date}}', label: 'Current Date', type: 'system' }
  ];

  const [conditionalRules, setConditionalRules] = useState(
    content?.conditional_rules || []
  );

  const insertVariable = (variable) => {
    const textarea = document.getElementById('content-editor');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        content.substring(0, start) + variable.key + content.substring(end);
      onContentChange(newContent);
      toast.success(`Inserted ${variable.label}`);
    }
  };

  const addConditionalRule = () => {
    const newRule = {
      id: `rule-${Date.now()}`,
      condition: { variable: '', operator: 'equals', value: '' },
      content: ''
    };
    setConditionalRules([...conditionalRules, newRule]);
  };

  const updateRule = (ruleId, field, value) => {
    setConditionalRules(
      conditionalRules.map(rule =>
        rule.id === ruleId ? { ...rule, [field]: value } : rule
      )
    );
  };

  const removeRule = (ruleId) => {
    setConditionalRules(conditionalRules.filter(r => r.id !== ruleId));
  };

  return (
    <div className="space-y-4">
      {/* Main Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Email Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            id="content-editor"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full h-40 p-3 border border-slate-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter email content. Use variables below for personalization..."
          />
        </CardContent>
      </Card>

      {/* Variable Palette */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Personalization Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {availableVariables.map(variable => (
              <Button
                key={variable.key}
                variant="outline"
                size="sm"
                onClick={() => insertVariable(variable)}
                className="text-xs"
              >
                {variable.label}
              </Button>
            ))}
          </div>

          {/* Variable Preview */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs font-medium text-slate-600 mb-2">Detected Variables:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(content.matchAll(/\{\{[\w_]+\}\}/g)).map((match, idx) => (
                <Badge key={idx} variant="secondary">
                  {match[0]}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditional Content */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-sm">Conditional Content</CardTitle>
          <Button size="sm" onClick={addConditionalRule} className="gap-1">
            <Plus className="w-3 h-3" />
            Add Rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {conditionalRules.length === 0 ? (
            <p className="text-sm text-slate-500">No conditional rules. Add one to display content based on lead properties.</p>
          ) : (
            conditionalRules.map(rule => (
              <div key={rule.id} className="p-3 border border-slate-200 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <Select
                    value={rule.condition.variable}
                    onValueChange={(value) =>
                      updateRule(rule.id, 'condition', {
                        ...rule.condition,
                        variable: value
                      })
                    }
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Select variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariables.map(v => (
                        <SelectItem key={v.key} value={v.key}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={rule.condition.operator}
                    onValueChange={(value) =>
                      updateRule(rule.id, 'condition', {
                        ...rule.condition,
                        operator: value
                      })
                    }
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                      <SelectItem value="less_than">Less Than</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="text"
                    placeholder="Value"
                    value={rule.condition.value}
                    onChange={(e) =>
                      updateRule(rule.id, 'condition', {
                        ...rule.condition,
                        value: e.target.value
                      })
                    }
                    className="flex-1 h-8 text-xs"
                  />

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRule(rule.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                <textarea
                  value={rule.content}
                  onChange={(e) => updateRule(rule.id, 'content', e.target.value)}
                  placeholder="Content to show if condition is met..."
                  className="w-full h-20 p-2 text-xs border border-slate-300 rounded font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle className="text-sm">Preview (Sample Data)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-white border border-slate-200 rounded text-sm text-slate-900 whitespace-pre-wrap break-words max-h-40 overflow-auto">
            {content
              .replace(/\{\{first_name\}\}/g, 'John')
              .replace(/\{\{last_name\}\}/g, 'Doe')
              .replace(/\{\{company\}\}/g, 'Acme Corp')
              .replace(/\{\{lead_score\}\}/g, '85')
              .replace(/\{\{contact_type\}\}/g, 'Buyer')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}