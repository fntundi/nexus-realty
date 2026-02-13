import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MessageSquare, Mail, Calendar, Send, Clock, CheckCircle2, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function UnifiedCommunicationHub({ contact, transaction }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('messages');
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Fetch all interactions
  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions', contact?.id],
    queryFn: () => base44.entities.Interaction.filter({ contact_id: contact.id }, '-interaction_date'),
    enabled: !!contact?.id
  });

  // Fetch messages if transaction exists
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', transaction?.id],
    queryFn: () => base44.entities.Message.filter({ transaction_id: transaction.id }, '-created_date'),
    enabled: !!transaction?.id
  });

  const emailInteractions = interactions.filter(i => i.interaction_type === 'email');
  const meetingInteractions = interactions.filter(i => i.interaction_type === 'meeting');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Communication Hub
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              setActiveTab('email');
              setComposeDialogOpen(true);
            }}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            <Button size="sm" onClick={() => setScheduleMeetingOpen(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="messages">
              Messages {messages.length > 0 && `(${messages.length})`}
            </TabsTrigger>
            <TabsTrigger value="email">
              Email {emailInteractions.length > 0 && `(${emailInteractions.length})`}
            </TabsTrigger>
            <TabsTrigger value="meetings">
              Meetings {meetingInteractions.length > 0 && `(${meetingInteractions.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <MessagesList 
              messages={messages} 
              contact={contact}
              transaction={transaction}
              currentUserEmail={user?.email}
            />
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <EmailHistory interactions={emailInteractions} />
          </TabsContent>

          <TabsContent value="meetings" className="space-y-4">
            <MeetingsList meetings={meetingInteractions} contactId={contact?.id} />
          </TabsContent>
        </Tabs>

        <ComposeEmailDialog
          open={composeDialogOpen}
          onOpenChange={setComposeDialogOpen}
          contact={contact}
          userEmail={user?.email}
        />

        <ScheduleMeetingDialog
          open={scheduleMeetingOpen}
          onOpenChange={setScheduleMeetingOpen}
          contact={contact}
          userEmail={user?.email}
        />
      </CardContent>
    </Card>
  );
}

function MessagesList({ messages, contact, transaction, currentUserEmail }) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');

  const sendMessageMutation = useMutation({
    mutationFn: (content) => {
      if (!transaction) {
        throw new Error('Transaction required for messaging');
      }
      return base44.entities.Message.create({
        transaction_id: transaction.id,
        sender_email: currentUserEmail,
        recipient_emails: [contact.email],
        content: content,
        message_type: 'message'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setNewMessage('');
      toast.success('Message sent');
    }
  });

  if (!transaction) {
    return (
      <div className="text-center py-8 text-slate-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p>Messages require an active transaction</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto space-y-3 p-4 bg-slate-50 rounded-lg">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id}
              className={`flex ${message.sender_email === currentUserEmail ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] rounded-lg p-3 ${
                message.sender_email === currentUserEmail 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-slate-200'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.sender_email === currentUserEmail ? 'text-blue-100' : 'text-slate-500'
                }`}>
                  {format(new Date(message.created_date), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
              e.preventDefault();
              sendMessageMutation.mutate(newMessage);
            }
          }}
        />
        <Button 
          onClick={() => sendMessageMutation.mutate(newMessage)}
          disabled={!newMessage.trim() || sendMessageMutation.isPending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function EmailHistory({ interactions }) {
  if (interactions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p>No email history</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {interactions.map(interaction => (
        <Card key={interaction.id} className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold">{interaction.subject}</h4>
              </div>
              <span className="text-xs text-slate-500">
                {format(new Date(interaction.interaction_date), 'MMM d, h:mm a')}
              </span>
            </div>
            {interaction.description && (
              <p className="text-sm text-slate-700 mt-2">{interaction.description}</p>
            )}
            {interaction.outcome && (
              <Badge className="mt-2 bg-purple-100 text-purple-800">
                {interaction.outcome.replace(/_/g, ' ')}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MeetingsList({ meetings, contactId }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['meeting-tasks', contactId],
    queryFn: () => base44.entities.Task.filter({ 
      contact_id: contactId,
      task_type: 'meeting'
    }, '-due_date'),
    enabled: !!contactId
  });

  const allMeetings = [...meetings, ...tasks.map(t => ({
    id: t.id,
    subject: t.title,
    interaction_date: t.due_date,
    description: t.description,
    status: t.status,
    meeting_location: t.meeting_location,
    meeting_link: t.meeting_link,
    isTask: true
  }))].sort((a, b) => new Date(b.interaction_date) - new Date(a.interaction_date));

  if (allMeetings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p>No meetings scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allMeetings.map(meeting => (
        <Card key={meeting.id} className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold">{meeting.subject}</h4>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-500">
                  {format(new Date(meeting.interaction_date), 'MMM d, h:mm a')}
                </span>
                {meeting.isTask && meeting.status === 'completed' && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
            {meeting.description && (
              <p className="text-sm text-slate-700 mt-2">{meeting.description}</p>
            )}
            {meeting.meeting_location && (
              <div className="text-sm text-slate-600 mt-2">
                📍 {meeting.meeting_location}
              </div>
            )}
            {meeting.meeting_link && (
              <a 
                href={meeting.meeting_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
              >
                <Video className="w-3 h-3" />
                Join Meeting
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ComposeEmailDialog({ open, onOpenChange, contact, userEmail }) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const sendEmailMutation = useMutation({
    mutationFn: () => {
      return Promise.all([
        base44.integrations.Core.SendEmail({
          to: contact.email,
          subject: subject,
          body: body
        }),
        base44.entities.Interaction.create({
          contact_id: contact.id,
          interaction_type: 'email',
          subject: subject,
          description: body,
          conducted_by: userEmail,
          interaction_date: new Date().toISOString(),
          outcome: 'action_taken',
          priority: 'medium'
        })
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['interactions']);
      toast.success('Email sent successfully');
      setSubject('');
      setBody('');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to send email');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Email to {contact?.first_name} {contact?.last_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Input value={contact?.email} disabled />
          </div>
          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body..."
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => sendEmailMutation.mutate()}
            disabled={!subject || !body || sendEmailMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleMeetingDialog({ open, onOpenChange, contact, userEmail }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meeting_date: '',
    duration_minutes: 60,
    meeting_type: 'in_person',
    location: '',
    meeting_link: ''
  });

  const scheduleMeetingMutation = useMutation({
    mutationFn: () => {
      return Promise.all([
        base44.entities.Task.create({
          title: formData.title,
          description: formData.description,
          task_type: 'meeting',
          status: 'pending',
          priority: 'high',
          due_date: new Date(formData.meeting_date).toISOString(),
          assigned_to_email: userEmail,
          contact_id: contact.id,
          contact_email: contact.email,
          meeting_location: formData.location,
          meeting_link: formData.meeting_link,
          duration_minutes: formData.duration_minutes
        }),
        base44.entities.Interaction.create({
          contact_id: contact.id,
          interaction_type: 'meeting',
          subject: formData.title,
          description: formData.description,
          conducted_by: userEmail,
          interaction_date: new Date(formData.meeting_date).toISOString(),
          outcome: 'scheduled',
          priority: 'high',
          duration_minutes: formData.duration_minutes
        })
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meeting-tasks']);
      queryClient.invalidateQueries(['interactions']);
      toast.success('Meeting scheduled successfully');
      setFormData({
        title: '',
        description: '',
        meeting_date: '',
        duration_minutes: 60,
        meeting_type: 'in_person',
        location: '',
        meeting_link: ''
      });
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Meeting with {contact?.first_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Meeting Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Property viewing, consultation, etc."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.meeting_date}
                onChange={(e) => setFormData({...formData, meeting_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({...formData, duration_minutes: Number(e.target.value)})}
              />
            </div>
          </div>
          <div>
            <Label>Meeting Type</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={formData.meeting_type === 'in_person' ? 'default' : 'outline'}
                onClick={() => setFormData({...formData, meeting_type: 'in_person'})}
              >
                In Person
              </Button>
              <Button
                type="button"
                variant={formData.meeting_type === 'video' ? 'default' : 'outline'}
                onClick={() => setFormData({...formData, meeting_type: 'video'})}
              >
                Video Call
              </Button>
              <Button
                type="button"
                variant={formData.meeting_type === 'phone' ? 'default' : 'outline'}
                onClick={() => setFormData({...formData, meeting_type: 'phone'})}
              >
                <Phone className="w-4 h-4 mr-2" />
                Phone
              </Button>
            </div>
          </div>
          {formData.meeting_type === 'in_person' && (
            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Meeting location address..."
              />
            </div>
          )}
          {formData.meeting_type === 'video' && (
            <div>
              <Label>Video Call Link</Label>
              <Input
                value={formData.meeting_link}
                onChange={(e) => setFormData({...formData, meeting_link: e.target.value})}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Meeting agenda, items to discuss..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => scheduleMeetingMutation.mutate()}
            disabled={!formData.title || !formData.meeting_date || scheduleMeetingMutation.isPending}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {scheduleMeetingMutation.isPending ? 'Scheduling...' : 'Schedule Meeting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}