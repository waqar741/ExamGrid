'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createPayRate } from '@/app/actions/pay-rates';
import { format } from 'date-fns';

interface CreateRateModalProps {
  branches: any[];
}

export function CreateRateModal({ branches }: CreateRateModalProps) {
  const SHIFT_TYPES = [
    { id: 'MORNING', name: 'Morning' },
    { id: 'AFTERNOON', name: 'Afternoon' },
    { id: 'FULL_DAY', name: 'Full Day' }
  ];
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const res = await createPayRate(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Rate</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Pay Rate</DialogTitle>
            <DialogDescription>
              Set a new payment rate for a branch shift.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="branch_id">Branch</Label>
              <Select name="branch_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shift_type">Shift Type</Label>
              <Select name="shift_type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift type" />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rate">Rate Amount (₹)</Label>
              <Input id="rate" name="rate" type="number" step="0.01" min="0" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input id="effective_from" name="effective_from" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="effective_to">Effective To (Optional)</Label>
              <Input id="effective_to" name="effective_to" type="date" />
              <p className="text-xs text-muted-foreground">Leave blank if the rate is ongoing.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
