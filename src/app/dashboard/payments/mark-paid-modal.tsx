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
import { markPaid } from '@/app/actions/payments';
import { format } from 'date-fns';

export function MarkPaidModal({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const date = formData.get('payment_date') as string;
    const remarks = formData.get('remarks') as string;

    if (!remarks || !remarks.trim()) {
      setError('A processing reason is required to continue.');
      setLoading(false);
      return;
    }

    const res = await markPaid(paymentId, date, remarks);

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
        <Button variant="outline" size="sm">Mark Paid</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Mark this assignment payment as completed. A processing reason/remarks must be provided.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-destructive font-medium bg-destructive/10 p-2.5 rounded-md">{error}</div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                name="payment_date"
                type="date"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remarks">Reason for Marking as Paid</Label>
              <textarea
                id="remarks"
                name="remarks"
                rows={3}
                placeholder="Enter the payment remarks or transaction ID..."
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus:border-ring outline-none"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
