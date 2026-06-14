'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { requestPayment } from '@/app/actions/payments';
import type { EmployeePaymentItem } from '@/app/actions/payments';

interface RequestPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: EmployeePaymentItem;
}

function attendanceBadge(att: string) {
  switch (att) {
    case 'present':
      return <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Present</Badge>;
    case 'late':
      return <Badge className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">Late</Badge>;
    default:
      return <Badge variant="outline" className="text-xs capitalize">{att}</Badge>;
  }
}

export function RequestPaymentModal({ open, onOpenChange, payment }: RequestPaymentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleRequest = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await requestPayment(payment.id, remarks || undefined);
      if (res?.error) {
        setError(res.error);
      } else {
        onOpenChange(false);
        setRemarks('');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred while requesting payment.');
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setRemarks(''); setError(''); } }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            Request Payment
          </DialogTitle>
          <DialogDescription>
            Confirm the shift details below and submit your payment request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          {/* Shift Details */}
          <div className="grid grid-cols-[120px_1fr] gap-y-3.5 gap-x-4 text-sm">
            <span className="text-muted-foreground font-medium">Date</span>
            <span className="font-medium">
              {payment.date ? format(new Date(payment.date), 'd MMMM yyyy') : '-'}
            </span>

            <span className="text-muted-foreground font-medium">Branch</span>
            <span className="font-medium">{payment.branch}</span>

            <span className="text-muted-foreground font-medium">Shift</span>
            <span className="font-medium">{payment.shiftType}</span>

            <span className="text-muted-foreground font-medium">Attendance</span>
            <span>{attendanceBadge(payment.attendance)}</span>

            <span className="text-muted-foreground font-medium">Amount</span>
            <span className="font-bold text-lg text-emerald-600">₹{payment.amount.toLocaleString()}</span>

            <span className="text-muted-foreground font-medium">Payment Rate</span>
            <span className="font-medium">₹{payment.paymentRate.toLocaleString()}</span>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this payment request..."
              className="min-h-[80px] text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRequest} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
