import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Phone, Mail, Calendar, CheckCircle2, Clock, Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function VendorManagement({ transactionId }) {
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [communicationDialogOpen, setCommunicationDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.filter({ is_active: true })
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['vendor-assignments', transactionId],
    queryFn: () => base44.entities.VendorAssignment.filter({ transaction_id: transactionId }),
    enabled: !!transactionId
  });

  const assignVendorMutation = useMutation({
    mutationFn: (data) => base44.entities.VendorAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-assignments']);
      toast.success('Vendor assigned successfully');
      setAssignDialogOpen(false);
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VendorAssignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-assignments']);
      toast.success('Assignment updated');
    }
  });

  const addCommunicationMutation = useMutation({
    mutationFn: ({ assignmentId, communication }) => {
      const assignment = assignments.find(a => a.id === assignmentId);
      const updatedComms = [...(assignment.communications || []), communication];
      return base44.entities.VendorAssignment.update(assignmentId, {
        communications: updatedComms
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-assignments']);
      toast.success('Communication logged');
      setCommunicationDialogOpen(false);
    }
  });

  const getVendor = (vendorId) => vendors.find(v => v.id === vendorId);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Third-Party Vendors</h2>
        <Button onClick={() => setAssignDialogOpen(true)}>
          <Users className="w-4 h-4 mr-2" />
          Assign Vendor
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No vendors assigned yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map(assignment => {
            const vendor = getVendor(assignment.vendor_id);
            if (!vendor) return null;

            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{vendor.name}</CardTitle>
                      <p className="text-sm text-slate-600 capitalize">
                        {assignment.vendor_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Badge className={statusColors[assignment.status]}>
                      {assignment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {vendor.contact_name && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {vendor.contact_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {vendor.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {vendor.email}
                    </div>
                    {assignment.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {format(new Date(assignment.scheduled_date), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>

                  {assignment.deliverables?.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-semibold text-sm">Deliverables:</div>
                      {assignment.deliverables.map((deliverable, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div>
                            <div className="text-sm font-medium">{deliverable.name}</div>
                            {deliverable.expected_date && (
                              <div className="text-xs text-slate-600">
                                Expected: {format(new Date(deliverable.expected_date), 'MMM d')}
                              </div>
                            )}
                          </div>
                          {deliverable.status === 'received' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {assignment.communications?.length > 0 && (
                    <div className="text-sm text-slate-600">
                      {assignment.communications.length} communication(s) logged
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setCommunicationDialogOpen(true);
                      }}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Log Communication
                    </Button>
                    {assignment.status === 'completed' && !assignment.rating && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const rating = prompt('Rate this vendor (1-5 stars):');
                          if (rating) {
                            updateAssignmentMutation.mutate({
                              id: assignment.id,
                              data: { rating: Number(rating) }
                            });
                          }
                        }}
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Rate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign Vendor Dialog */}
      <AssignVendorDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        vendors={vendors}
        transactionId={transactionId}
        onAssign={(data) => assignVendorMutation.mutate(data)}
      />

      {/* Log Communication Dialog */}
      <LogCommunicationDialog
        open={communicationDialogOpen}
        onOpenChange={setCommunicationDialogOpen}
        assignment={selectedAssignment}
        onLog={(communication) => addCommunicationMutation.mutate({
          assignmentId: selectedAssignment.id,
          communication
        })}
      />
    </div>
  );
}

function AssignVendorDialog({ open, onOpenChange, vendors, transactionId, onAssign }) {
  const [formData, setFormData] = useState({
    vendor_id: '',
    vendor_type: '',
    scheduled_date: '',
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const handleSubmit = () => {
    onAssign({
      ...formData,
      transaction_id: transactionId,
      assigned_by_email: user?.email,
      assigned_date: new Date().toISOString(),
      status: 'pending'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Vendor</label>
            <Select value={formData.vendor_id} onValueChange={(val) => setFormData({ ...formData, vendor_id: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name} - {vendor.vendor_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Service Type</label>
            <Select value={formData.vendor_type} onValueChange={(val) => setFormData({ ...formData, vendor_type: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inspector">Inspector</SelectItem>
                <SelectItem value="appraiser">Appraiser</SelectItem>
                <SelectItem value="title_company">Title Company</SelectItem>
                <SelectItem value="escrow">Escrow</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Scheduled Date/Time</label>
            <Input
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Assign Vendor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogCommunicationDialog({ open, onOpenChange, assignment, onLog }) {
  const [formData, setFormData] = useState({
    type: 'email',
    subject: '',
    message: ''
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const handleSubmit = () => {
    const vendor = assignment?.vendor_id;
    onLog({
      date: new Date().toISOString(),
      from_email: user?.email,
      to_email: vendor?.email,
      type: formData.type,
      subject: formData.subject,
      message: formData.message
    });
    setFormData({ type: 'email', subject: '', message: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Communication</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="text">Text Message</SelectItem>
                <SelectItem value="note">Internal Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief subject or topic"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Message/Notes</label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              placeholder="Communication details..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Log Communication</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}