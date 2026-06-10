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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ConfirmationModalProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  level: 1 | 2 | 3;
  confirmLabel?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onConfirm: (reason?: string) => Promise<any> | void;
}

export function ConfirmationModal({
  trigger,
  title,
  description,
  level,
  confirmLabel = 'Confirm',
  confirmVariant = 'default',
  onConfirm,
}: ConfirmationModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');

    if (level === 2 && !reason.trim()) {
      setError('A reason is required to continue.');
      return;
    }

    if (level === 3 && confirmText !== 'CONFIRM') {
      setError('Please type CONFIRM exactly to proceed.');
      return;
    }

    setLoading(true);
    try {
      const res = await onConfirm(level === 2 ? reason : undefined);
      if (res?.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setReason('');
        setConfirmText('');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        setReason('');
        setConfirmText('');
        setError('');
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle className={confirmVariant === 'destructive' ? 'text-destructive' : 'text-foreground'}>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-sm text-destructive font-medium bg-destructive/10 p-2.5 rounded-md">
              {error}
            </div>
          )}

          {level === 2 && (
            <div className="grid gap-2">
              <Label htmlFor="confirmation-reason">Reason required:</Label>
              <textarea
                id="confirmation-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please enter the reason for this action..."
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus:border-ring outline-none"
                required
              />
            </div>
          )}

          {level === 3 && (
            <div className="grid gap-2">
              <Label htmlFor="confirmation-text">
                Type <span className="font-bold text-destructive">CONFIRM</span> to verify:
              </Label>
              <Input
                id="confirmation-text"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM"
                required
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={loading || (level === 3 && confirmText !== 'CONFIRM') || (level === 2 && !reason.trim())}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
