import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, AlertCircle, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function ProactiveAlerts({ alerts, properties, onViewTransaction }) {
  if (!alerts) return null;

  const getProperty = (propertyId) => {
    return properties?.find(p => p.id === propertyId);
  };

  const totalAlerts = (alerts.stalled?.length || 0) + (alerts.overdue?.length || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          Proactive Alerts
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="ml-2">{totalAlerts}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stalled Transactions */}
        {alerts.stalled && alerts.stalled.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-sm">Stalled Transactions</h4>
              <Badge variant="outline" className="text-red-600">
                {alerts.stalled.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {alerts.stalled.slice(0, 3).map((alert, idx) => {
                const property = getProperty(alert.property_id);
                return (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {property?.address || 'Property'}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Buyer: {alert.buyer_email}
                        </div>
                        <div className="text-xs text-red-700 mt-1">
                          No activity for {alert.days_since_update} days
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewTransaction?.(alert.transaction_id)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overdue Tasks */}
        {alerts.overdue && alerts.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-orange-600" />
              <h4 className="font-semibold text-sm">Overdue Tasks</h4>
              <Badge variant="outline" className="text-orange-600">
                {alerts.overdue.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {alerts.overdue.slice(0, 3).map((alert, idx) => (
                <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{alert.title}</div>
                      <div className="text-xs text-orange-700 mt-1">
                        {alert.days_overdue} {alert.days_overdue === 1 ? 'day' : 'days'} overdue
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewTransaction?.(alert.transaction_id)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Deadlines */}
        {alerts.upcoming && alerts.upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-sm">Upcoming Deadlines</h4>
              <Badge variant="outline" className="text-blue-600">
                {alerts.upcoming.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {alerts.upcoming.slice(0, 3).map((alert, idx) => (
                <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{alert.title}</div>
                      <div className="text-xs text-blue-700 mt-1">
                        Due in {alert.days_until} {alert.days_until === 1 ? 'day' : 'days'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewTransaction?.(alert.transaction_id)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalAlerts === 0 && (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>All caught up! No alerts at this time.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}