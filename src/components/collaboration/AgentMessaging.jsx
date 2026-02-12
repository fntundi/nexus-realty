import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AgentMessaging({ transactionId }) {
  const [user, setUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    })();
  }, []);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', transactionId],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ transaction_id: transactionId });
      return msgs?.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) || [];
    },
    enabled: !!transactionId,
    refetchInterval: 3000
  });

  const { data: transaction } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => base44.entities.Transaction.filter({ id: transactionId }),
    enabled: !!transactionId
  });

  const { data: agents } = useQuery({
    queryKey: ['agentsForMessaging'],
    queryFn: () => base44.entities.Agent.list()
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText('');
      setAttachments([]);
    }
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !transaction) return;

    const txn = transaction[0];
    const recipients = [txn.agent_id, txn.buyer_email, txn.lender_email].filter(Boolean);

    sendMessageMutation.mutate({
      transaction_id: transactionId,
      sender_email: user.email,
      recipient_emails: recipients,
      content: messageText,
      attachment_urls: attachments,
      message_type: 'message'
    });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const getAgentName = (email) => {
    const agent = agents?.find(a => a.user_email === email);
    return agent ? email.split('@')[0] : email;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Team Messages</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden pt-4">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages && messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender_email === user?.email ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    msg.sender_email === user?.email
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {getAgentName(msg.sender_email)}
                  </div>
                  <p className="text-sm break-words">{msg.content}</p>
                  {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.attachment_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline block"
                        >
                          📎 Attachment
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_date).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-500 text-sm">No messages yet. Start the conversation!</p>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}