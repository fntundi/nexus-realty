import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Calendar, MessageSquare, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function ContactActivityFeed({ interactions }) {
  const getInteractionIcon = (type) => {
    const icons = {
      call: <Phone className="w-4 h-4" />,
      email: <Mail className="w-4 h-4" />,
      meeting: <Calendar className="w-4 h-4" />,
      sms: <MessageSquare className="w-4 h-4" />,
      note: <FileText className="w-4 h-4" />
    };
    return icons[type] || <FileText className="w-4 h-4" />;
  };

  const getInteractionColor = (type) => {
    const colors = {
      call: 'bg-blue-50 border-blue-200',
      email: 'bg-purple-50 border-purple-200',
      meeting: 'bg-green-50 border-green-200',
      sms: 'bg-yellow-50 border-yellow-200',
      note: 'bg-slate-50 border-slate-200'
    };
    return colors[type] || 'bg-slate-50 border-slate-200';
  };

  const getOutcomeBadge = (outcome) => {
    const variants = {
      follow_up_needed: 'bg-orange-100 text-orange-800',
      action_taken: 'bg-green-100 text-green-800',
      no_action: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800'
    };
    return <Badge className={variants[outcome]}>{outcome.replace(/_/g, ' ')}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[priority]}>{priority}</Badge>;
  };

  if (interactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No interactions logged yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {interactions.map(interaction => (
        <Card key={interaction.id} className={`border ${getInteractionColor(interaction.interaction_type)}`}>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600">
                {getInteractionIcon(interaction.interaction_type)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{interaction.subject}</h3>
                    <p className="text-sm text-slate-500">
                      {format(new Date(interaction.interaction_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {getOutcomeBadge(interaction.outcome)}
                    {getPriorityBadge(interaction.priority)}
                  </div>
                </div>

                {interaction.description && (
                  <p className="text-slate-700 text-sm mb-3">{interaction.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                  {interaction.duration_minutes && (
                    <div>
                      <span className="text-slate-500">Duration: </span>
                      <span className="font-medium text-slate-700">{interaction.duration_minutes} minutes</span>
                    </div>
                  )}
                  {interaction.conducted_by && (
                    <div>
                      <span className="text-slate-500">Logged by: </span>
                      <span className="font-medium text-slate-700">{interaction.conducted_by}</span>
                    </div>
                  )}
                </div>

                {(interaction.next_step || interaction.follow_up_date) && (
                  <div className="p-3 bg-white rounded border border-slate-200 text-sm">
                    {interaction.next_step && (
                      <div className="mb-1">
                        <span className="text-slate-500">Next Step: </span>
                        <span className="font-medium text-slate-700">{interaction.next_step}</span>
                      </div>
                    )}
                    {interaction.follow_up_date && (
                      <div>
                        <span className="text-slate-500">Follow-up: </span>
                        <span className="font-medium text-slate-700">
                          {format(new Date(interaction.follow_up_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}