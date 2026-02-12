import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, Trash2, Play } from 'lucide-react';
import { format } from 'date-fns';

export default function SavedSearchesList({ user, onLoadSearch }) {
  const queryClient = useQueryClient();

  const { data: searches = [], isLoading } = useQuery({
    queryKey: ['savedSearches', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const saved = await base44.entities.SavedSearch.filter({ user_email: user.email });
      return saved || [];
    },
    enabled: !!user
  });

  const deleteSearchMutation = useMutation({
    mutationFn: (searchId) => base44.entities.SavedSearch.delete(searchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    }
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (searches.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Saved Searches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {searches.map(search => (
            <div
              key={search.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{search.search_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <p className="text-xs text-slate-500">
                    {search.last_used
                      ? `Last used ${format(new Date(search.last_used), 'MMM d')}`
                      : 'Never used'}
                  </p>
                  {search.result_count > 0 && (
                    <Badge variant="outline" className="text-xs ml-2">
                      {search.result_count} results
                    </Badge>
                  )}
                  {search.send_alerts && (
                    <Badge className="text-xs bg-blue-100 text-blue-800">Alerts on</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onLoadSearch(search)}
                  className="gap-1"
                >
                  <Play className="w-3 h-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Search</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{search.search_name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteSearchMutation.mutate(search.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}