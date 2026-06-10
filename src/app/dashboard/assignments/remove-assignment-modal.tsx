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
import { removeAssignment } from '@/app/actions/assignments';

interface RemoveAssignmentModalProps {
  assignmentId: string;
  currentEmployeeName: string;
}

export function RemoveAssignmentModal({ assignmentId, currentEmployeeName }: RemoveAssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');

  const handleRemove = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for removal.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await removeAssignment(assignmentId, reason);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Remove Assignment</DialogTitle>
          <DialogDescription>
            Cancel this exam shift assignment. This action will log a cancellation reason in history.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-sm text-destructive font-medium">{error}</div>
          )}
          
          <div className="grid gap-2">
            <Label>Employee</Label>
            <div className="text-sm font-medium p-2 bg-muted rounded-md">{currentEmployeeName}</div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="remove_reason">Reason for Removal</Label>
            <Input
              id="remove_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Exam cancelled, Employee no longer needed"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleRemove} disabled={loading}>
            {loading ? 'Removing...' : 'Confirm Removal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
