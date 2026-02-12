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
import { Calendar, Clock } from 'lucide-react';

export default function ScheduleEmailSequenceDialog({ sequenceId, onSuccess }) {
  const queryClient = useQueryClient();
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [segmentId, setSegmentId] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState('daily');
  const [recurringDay, setRecurringDay] = useState('0');

  const { data: segments = [] } = useQuery({
    queryKey: ['contactSegments'],
    queryFn: () => base44.entities.ContactSegment.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailSequenceSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSchedules'] });
      onSuccess?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const scheduleData = {
      sequence_id: sequenceId,
      schedule_type: scheduleType,
      segment_id: segmentId || null,
      status: 'active'
    };

    if (scheduleType === 'scheduled') {
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      scheduleData.scheduled_date = dateTime.toISOString();
    }

    if (scheduleType === 'recurring') {
      scheduleData.recurring_pattern = {
        frequency: recurringFrequency,
        day_of_week: recurringFrequency === 'weekly' ? parseInt(recurringDay) : undefined,
        time: scheduledTime
      };
    }

    createMutation.mutate(scheduleData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Email Sequence</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>When to Send</Label>
            <Select value={scheduleType} onValueChange={setScheduleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Send Immediately</SelectItem>
                <SelectItem value="scheduled">Send at Specific Time</SelectItem>
                <SelectItem value="recurring">Recurring Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scheduleType === 'scheduled' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {scheduleType === 'recurring' && (
            <>
              <div>
                <Label>Frequency</Label>
                <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurringFrequency === 'weekly' && (
                <div>
                  <Label>Day of Week</Label>
                  <Select value={recurringDay} onValueChange={setRecurringDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="recurring_time">Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <Input
                    id="recurring_time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Target Segment (Optional)</Label>
            <Select value={segmentId} onValueChange={setSegmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Send to all contacts or select segment..." />
              </SelectTrigger>
              <SelectContent>
                {segments.map(seg => (
                  <SelectItem key={seg.id} value={seg.id}>
                    {seg.name} ({seg.contact_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Scheduling...' : 'Schedule Sequence'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}