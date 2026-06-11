'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { markBranchPaid } from '@/app/actions/payments';
import { format } from 'date-fns';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MarkBranchPaidModalProps {
  branchId: string;
  branchName: string;
  shiftDate: string;
  employeeCount: number;
  totalAmount: number;
  onSuccess: () => void;
}

export function MarkBranchPaidModal({
  branchId,
  branchName,
  shiftDate,
  employeeCount,
  totalAmount,
  onSuccess,
}: MarkBranchPaidModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetState = () => {
    setStep(1);
    setConfirmText('');
    setError('');
    setLoading(false);
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) resetState();
  };

  const handleConfirm = async () => {
    if (confirmText !== 'CONFIRM') {
      setError('Please type CONFIRM to proceed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await markBranchPaid(branchId, shiftDate, today, `Branch settlement for ${branchName} on ${format(new Date(shiftDate), 'MMM d, yyyy')}`);

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        setOpen(false);
        resetState();
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Mark Branch Paid
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {/* Step 1: Summary */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Branch Settlement Summary</DialogTitle>
              <DialogDescription>
                Review the settlement details before proceeding.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-muted-foreground">Branch</div>
                <div className="font-medium">{branchName}</div>
                <div className="text-muted-foreground">Date</div>
                <div className="font-medium">{format(new Date(shiftDate), 'MMM d, yyyy')}</div>
                <div className="text-muted-foreground">Employees</div>
                <div className="font-medium">{employeeCount}</div>
                <div className="text-muted-foreground">Total Amount</div>
                <div className="font-bold text-emerald-600">₹{totalAmount.toLocaleString()}</div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Confirmation */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Confirm Settlement
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to mark this branch settlement as paid?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                This will mark <strong>{employeeCount} payment{employeeCount !== 1 ? 's' : ''}</strong> totaling <strong>₹{totalAmount.toLocaleString()}</strong> as paid for <strong>{branchName}</strong> on <strong>{format(new Date(shiftDate), 'MMM d, yyyy')}</strong>.
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Proceed
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Type CONFIRM */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Final Confirmation</DialogTitle>
              <DialogDescription>
                Type <strong>CONFIRM</strong> below to execute the settlement.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {error && (
                <div className="text-sm text-destructive font-medium bg-destructive/10 p-2.5 rounded-md">{error}</div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="confirm-text">Type CONFIRM</Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="CONFIRM"
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading || confirmText !== 'CONFIRM'}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Mark as Paid'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
