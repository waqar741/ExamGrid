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
import { updatePayRate, archivePayRate } from '@/app/actions/pay-rates';
import { format } from 'date-fns';

interface EditRateModalProps {
  rate: any;
  status: string;
  branches: any[];
}

export function EditRateModal({ rate, status, branches }: EditRateModalProps) {
  const SHIFT_TYPES: Record<string, string> = {
    'MORNING': 'Morning',
    'AFTERNOON': 'Afternoon', 
    'FULL_DAY': 'Full Day'
  };
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isHistoricalLocked = status === 'Active' || status === 'Expired';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    // If locked, we must manually append the original values because disabled inputs are not submitted
    if (isHistoricalLocked) {
      formData.set('rate', rate.rate);
      formData.set('effective_from', rate.effective_from);
    }

    const res = await updatePayRate(rate.id, formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (confirm('Are you sure you want to end this rate immediately? It will set the end date to yesterday.')) {
      setLoading(true);
      const res = await archivePayRate(rate.id);
      if (res?.error) {
        setError(res.error);
      } else {
        setOpen(false);
      }
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Pay Rate</DialogTitle>
            <DialogDescription>
              {isHistoricalLocked 
                ? "This rate has already started. You can only modify its End Date. To change the amount, set an End Date here and create a new rate."
                : "Modify the scheduled pay rate."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Input value={rate.branches?.name} disabled />
            </div>

            <div className="grid gap-2">
              <Label>Shift Type</Label>
              <Input value={SHIFT_TYPES[rate.shift_type] || rate.shift_type} disabled />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rate">Rate Amount (₹)</Label>
              <Input 
                id="rate" 
                name="rate" 
                type="number" 
                step="0.01" 
                min="0" 
                defaultValue={rate.rate} 
                disabled={isHistoricalLocked}
                required 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input 
                id="effective_from" 
                name="effective_from" 
                type="date" 
                defaultValue={format(new Date(rate.effective_from), 'yyyy-MM-dd')} 
                disabled={isHistoricalLocked}
                required 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="effective_to">Effective To (Optional)</Label>
              <Input 
                id="effective_to" 
                name="effective_to" 
                type="date" 
                defaultValue={rate.effective_to ? format(new Date(rate.effective_to), 'yyyy-MM-dd') : ''} 
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center w-full">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleArchive} 
              disabled={loading || status === 'Expired'}
            >
              End Immediately
            </Button>
            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
