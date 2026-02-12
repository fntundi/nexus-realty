import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, Circle, Clock, AlertCircle, MessageSquare, 
  Paperclip, ChevronDown, ChevronUp, User 
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TaskCard({ task, currentUser, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const statusIcons = {
    not_started: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' },
    in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100' },
    completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100' },
    blocked: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' }
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  };

  const statusConfig = statusIcons[task.status] || statusIcons.not_started;
  const StatusIcon = statusConfig.icon;

  const updateTaskMutation = useMutation({
    mutationFn: (updates) => base44.entities.TransactionTask.update(task.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionTasks'] });
      toast.success('Task updated');
    }
  });

  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_date = new Date().toISOString();
      updates.completed_by = currentUser.email;
    }
    updateTaskMutation.mutate(updates);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      comment: newComment,
      timestamp: new Date().toISOString()
    };

    updateTaskMutation.mutate({
      comments: [...(task.comments || []), comment]
    });
    setNewComment('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const attachment = {
        file_url,
        file_name: file.name,
        uploaded_by: currentUser.email,
        uploaded_date: new Date().toISOString()
      };

      await updateTaskMutation.mutateAsync({
        attachments: [...(task.attachments || []), attachment]
      });
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const isOverdue = task.due_date && task.status !== 'completed' && 
                     new Date(task.due_date) < new Date();

  return (
    <Card className={`${task.is_critical ? 'border-l-4 border-l-orange-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <button
              onClick={() => canEdit && setExpanded(!expanded)}
              className={`mt-1 ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-900">{task.title}</h3>
                {task.is_critical && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Critical
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
                <Badge variant="outline" className={statusConfig.bg}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.assigned_to_role !== 'any' && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {task.assigned_to_role}
                  </Badge>
                )}
                {task.due_date && (
                  <Badge variant="outline" className={isOverdue ? 'text-red-600 border-red-300' : ''}>
                    <Clock className="w-3 h-3 mr-1" />
                    {format(new Date(task.due_date), 'MMM d')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {task.description && (
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              {task.description}
            </div>
          )}

          {canEdit && task.status !== 'completed' && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('in_progress')}
                disabled={task.status === 'in_progress'}
              >
                Start Task
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange('completed')}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('blocked')}
                disabled={task.status === 'blocked'}
              >
                Mark Blocked
              </Button>
            </div>
          )}

          {task.completed_date && (
            <div className="text-sm text-slate-600 bg-green-50 p-3 rounded-lg">
              Completed by {task.completed_by} on {format(new Date(task.completed_date), 'MMM d, yyyy h:mm a')}
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Attachments</span>
              </div>
              <div className="space-y-1">
                {task.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    {att.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {task.comments && task.comments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Activity</span>
              </div>
              <div className="space-y-2">
                {task.comments.map((comment, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900">{comment.user_name}</span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(comment.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-slate-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Comment */}
          {canEdit && (
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                  Add Comment
                </Button>
                <label>
                  <Button size="sm" variant="outline" disabled={isUploading} asChild>
                    <span>
                      <Paperclip className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Attach File'}
                    </span>
                  </Button>
                  <Input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}