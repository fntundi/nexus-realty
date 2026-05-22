import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

function evaluateSegmentCriteria(contact, criteria) {
  return criteria.every(criterion => {
    const fieldValue = contact[criterion.field];
    const compareValue = criterion.value;

    switch (criterion.operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      case 'contains':
        return String(fieldValue).includes(String(compareValue));
      case 'in':
        return Array.isArray(compareValue) ? compareValue.includes(fieldValue) : false;
      case 'between':
        return Array.isArray(compareValue) && compareValue.length === 2 &&
          Number(fieldValue) >= Number(compareValue[0]) &&
          Number(fieldValue) <= Number(compareValue[1]);
      case 'date_after':
        return new Date(fieldValue) > new Date(compareValue);
      case 'date_before':
        return new Date(fieldValue) < new Date(compareValue);
      default:
        return false;
    }
  });
}

export default function ContactSegmentMembership({ contact }) {
  const { data: segments = [] } = useQuery({
    queryKey: ['contactSegments'],
    queryFn: () => base44.entities.ContactSegment.list('-created_date', 100)
  });

  const memberSegments = segments.filter(segment =>
    evaluateSegmentCriteria(contact, segment.criteria)
  );

  if (memberSegments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">This contact is not part of any segments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Membership</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberSegments.map(segment => (
            <div key={segment.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-900">{segment.name}</h3>
                <Badge variant={segment.is_dynamic ? 'default' : 'secondary'}>
                  {segment.is_dynamic ? 'Dynamic' : 'Static'}
                </Badge>
              </div>
              {segment.description && (
                <p className="text-sm text-slate-600 mb-3">{segment.description}</p>
              )}
              <div className="text-xs text-slate-600">
                <p><strong>Total Contacts:</strong> {segment.contact_count}</p>
                {segment.last_updated && (
                  <p><strong>Last Updated:</strong> {new Date(segment.last_updated).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}