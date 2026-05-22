import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, CheckSquare, Phone, Mail, Clock, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function TeamInbox() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['inbox-transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ agent_email: user?.email, status: 'active' }),
    enabled: !!user?.email
  });

  const transactionIds = transactions.map(t => t.id);

  const { data: messages = [] } = useQuery({
    queryKey: ['inbox-messages', transactionIds],
    queryFn: () => base44.entities.Message.list('-created_date', 50),
    enabled: transactionIds.length > 0
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['inbox-tasks', user?.email],
    queryFn: () => base44.entities.Task.filter(
      { assigned_to_email: user?.email, status: ['pending', 'in_progress'] },
      'due_date'
    ),
    enabled: !!user?.email
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['inbox-interactions', user?.email],
    queryFn: () => base44.entities.Interaction.filter({ conducted_by: user?.email }, '-interaction_date', 20),
    enabled: !!user?.email
  });

  const agentMessages = messages.filter(m => transactionIds.includes(m.transaction_id));
  const unreadMessages = agentMessages.filter(m => !m.read_by?.includes(user?.email));
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
  const dueTodayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return differenceInDays(new Date(t.due_date), new Date()) === 0;
  });

  const typeIcon = {
    call: <Phone className="w-3 h-3" />,
    email: <Mail className="w-3 h-3" />,
    sms: <MessageSquare className="w-3 h-3" />,
    meeting: <Clock className="w-3 h-3" />,
    note: <MessageSquare className="w-3 h-3" />
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team Inbox</h1>
          <p className="text-slate-600 mt-1">All inbound messages, tasks, and recent activity in one place</p>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{overdueTasks.length}</p>
                <p className="text-xs text-slate-600">Overdue tasks</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{unreadMessages.length}</p>
                <p className="text-xs text-slate-600">Unread messages</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{dueTodayTasks.length}</p>
                <p className="text-xs text-slate-600">Due today</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="messages">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages {unreadMessages.length > 0 && <Badge className="ml-2 text-xs">{unreadMessages.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <CheckSquare className="w-4 h-4 mr-2" />
              Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Clock className="w-4 h-4 mr-2" />
              Recent Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-4 space-y-3">
            {agentMessages.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-slate-500">No messages in your active deals.</CardContent></Card>
            ) : (
              agentMessages.map(msg => {
                const isUnread = !msg.read_by?.includes(user?.email);
                return (
                  <Card key={msg.id} className={isUnread ? 'border-l-4 border-l-blue-500' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900 text-sm">{msg.sender_email}</p>
                            {isUnread && <Badge className="text-xs">New</Badge>}
                            {msg.is_important && <Badge variant="destructive" className="text-xs">Important</Badge>}
                          </div>
                          <p className="text-sm text-slate-700 line-clamp-2">{msg.content}</p>
                        </div>
                        <p className="text-xs text-slate-400 whitespace-nowrap">
                          {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 space-y-3">
            {tasks.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-slate-500">All caught up! No pending tasks.</CardContent></Card>
            ) : (
              tasks.map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                return (
                  <Card key={task.id} className={isOverdue ? 'border-l-4 border-l-red-500 bg-red-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900 text-sm">{task.title}</p>
                            {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                            <Badge className="text-xs">{task.priority}</Badge>
                          </div>
                          {task.description && <p className="text-sm text-slate-600">{task.description}</p>}
                        </div>
                        <p className="text-xs text-slate-400 whitespace-nowrap">
                          {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No due date'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-3">
            {interactions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-slate-500">No recent activity logged.</CardContent></Card>
            ) : (
              interactions.map(int => (
                <Card key={int.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {typeIcon[int.interaction_type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 text-sm">{int.subject}</p>
                          <p className="text-xs text-slate-400 whitespace-nowrap">
                            {format(new Date(int.interaction_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        {int.description && <p className="text-sm text-slate-600 line-clamp-2">{int.description}</p>}
                        {int.outcome && <Badge className="mt-1 text-xs">{int.outcome.replace(/_/g, ' ')}</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}