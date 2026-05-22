import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ContactSegmentBuilder from '../components/email/ContactSegmentBuilder';

export default function ContactSegments() {
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);

  const { data: segments = [] } = useQuery({
    queryKey: ['contactSegments'],
    queryFn: () => base44.entities.ContactSegment.list('-created_date', 50)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContactSegment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactSegments'] });
    }
  });

  const handleEdit = (segment) => {
    setEditingSegment(segment);
    setShowBuilder(true);
  };

  const handleClose = () => {
    setShowBuilder(false);
    setEditingSegment(null);
  };

  const getCriteriaDescription = (criteria) => {
    return criteria.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Contact Segments</h1>
          <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Segment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSegment ? 'Edit' : 'Create'} Segment</DialogTitle>
              </DialogHeader>
              <ContactSegmentBuilder
                segment={editingSegment}
                onSuccess={handleClose}
              />
            </DialogContent>
          </Dialog>
        </div>

        {segments.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">No segments created yet</p>
              <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Create Your First Segment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Segment</DialogTitle>
                  </DialogHeader>
                  <ContactSegmentBuilder onSuccess={handleClose} />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segments.map(segment => (
              <Card key={segment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{segment.name}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">{segment.description}</p>
                    </div>
                    <Badge variant={segment.is_dynamic ? 'default' : 'secondary'}>
                      {segment.is_dynamic ? 'Dynamic' : 'Static'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Contacts in Segment:</p>
                    <p className="text-2xl font-bold text-slate-900">{segment.contact_count}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600 mb-2">Filter Criteria:</p>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded font-mono">
                      {getCriteriaDescription(segment.criteria)}
                    </p>
                  </div>

                  {segment.last_updated && (
                    <p className="text-xs text-slate-600">
                      Last updated: {new Date(segment.last_updated).toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(segment)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteMutation.mutate(segment.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}