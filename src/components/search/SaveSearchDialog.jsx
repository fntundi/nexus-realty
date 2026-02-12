import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function SaveSearchDialog({ filters, marketId, user }) {
  const [open, setOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [sendAlerts, setSendAlerts] = useState(false);
  const queryClient = useQueryClient();

  const saveSearchMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.SavedSearch.create({
        user_email: user.email,
        search_name: data.searchName,
        market_id: marketId,
        filters: data.filters,
        send_alerts: data.sendAlerts
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      setOpen(false);
      setSearchName('');
      setSendAlerts(false);
      toast.success('Search saved successfully!');
    },
    onError: () => {
      toast.error('Failed to save search');
    }
  });

  const handleSave = () => {
    if (!searchName.trim()) {
      toast.error('Please enter a search name');
      return;
    }
    saveSearchMutation.mutate({
      searchName,
      filters,
      sendAlerts
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BookmarkPlus className="w-4 h-4" />
          Save Search
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              placeholder="e.g., 3BR Family Homes Under $500K"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="alerts"
              checked={sendAlerts}
              onCheckedChange={setSendAlerts}
            />
            <Label htmlFor="alerts" className="font-normal text-sm cursor-pointer">
              Email me when new properties match this search
            </Label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveSearchMutation.isPending || !searchName.trim()}
              className="flex-1"
            >
              {saveSearchMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}