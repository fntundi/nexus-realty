import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, FileText, Download, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MessageThread({ transactionId, currentUserEmail }) {
  const [messageContent, setMessageContent] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', transactionId],
    queryFn: () => base44.entities.Message.filter({ transaction_id: transactionId }, '-created_date'),
    refetchInterval: 5000
  });

  const { data: transaction } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => base44.entities.Transaction.filter({ id: transactionId }).then(t => t[0])
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const recipients = [];
      if (transaction) {
        if (transaction.agent_id) {
          const agent = await base44.entities.Agent.filter({ id: transaction.agent_id }).then(a => a[0]);
          if (agent) recipients.push(agent.user_email);
        }
        if (transaction.buyer_email) recipients.push(transaction.buyer_email);
        if (transaction.lender_email) recipients.push(transaction.lender_email);
      }

      const uniqueRecipients = [...new Set(recipients.filter(r => r !== currentUserEmail))];

      return base44.entities.Message.create({
        ...messageData,
        recipient_emails: uniqueRecipients,
        read_by: [currentUserEmail]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', transactionId] });
      setMessageContent('');
      setAttachments([]);
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const message = messages.find(m => m.id === messageId);
      if (message && !message.read_by?.includes(currentUserEmail)) {
        return base44.entities.Message.update(messageId, {
          read_by: [...(message.read_by || []), currentUserEmail]
        });
      }
    }
  });

  useEffect(() => {
    messages.forEach(message => {
      if (!message.read_by?.includes(currentUserEmail) && message.sender_email !== currentUserEmail) {
        markAsReadMutation.mutate(message.id);
      }
    });
  }, [messages, currentUserEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments([...attachments, { name: file.name, url: file_url }]);
      toast.success('File attached');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendMessage = () => {
    if (!messageContent.trim() && attachments.length === 0) return;

    sendMessageMutation.mutate({
      transaction_id: transactionId,
      sender_email: currentUserEmail,
      content: messageContent || 'Shared documents',
      attachment_urls: attachments.map(a => a.url),
      message_type: attachments.length > 0 ? 'document_upload' : 'message'
    });
  };

  const sortedMessages = [...messages].reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedMessages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          sortedMessages.map((message) => {
            const isOwn = message.sender_email === currentUserEmail;
            const isUnread = !message.read_by?.includes(currentUserEmail);

            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-lg px-4 py-2 ${
                    isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
                  }`}>
                    {!isOwn && (
                      <div className="text-xs font-medium mb-1 opacity-75">
                        {message.sender_email}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.attachment_urls && message.attachment_urls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachment_urls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs p-2 rounded ${
                              isOwn ? 'bg-blue-700 hover:bg-blue-800' : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            <span>Attachment {idx + 1}</span>
                            <Download className="w-3 h-3 ml-auto" />
                          </a>
                        ))}
                      </div>
                    )}
                    
                    {message.message_type === 'document_request' && (
                      <Badge variant="outline" className="mt-2">Document Request</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    {format(new Date(message.created_date), 'MMM d, h:mm a')}
                    {isUnread && !isOwn && <Badge variant="destructive" className="text-xs">New</Badge>}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 p-4 bg-white">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded text-sm">
                <FileText className="w-4 h-4" />
                {att.name}
                <button
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder="Type your message..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || (!messageContent.trim() && attachments.length === 0)}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}