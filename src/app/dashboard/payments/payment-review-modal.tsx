'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getPaymentDetail,
  approvePayment,
  rejectPayment,
  markPaymentPaid,
  updatePayment,
  deletePayment,
} from '@/app/actions/payments';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  AlertTriangle,
  History,
} from 'lucide-react';

interface PaymentReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  onActionComplete?: () => void;
}

function statusBadge(status: string) {
  switch (status) {
    case 'not_requested':
      return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">Not Requested</Badge>;
    case 'requested':
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">Requested</Badge>;
    case 'approved':
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-50 text-red-600 border-red-200 hover:bg-red-50">Rejected</Badge>;
    case 'paid':
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Paid</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
}

function attendanceBadge(att: string) {
  switch (att) {
    case 'present':
      return <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Present</Badge>;
    case 'late':
      return <Badge className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">Late</Badge>;
    case 'absent':
      return <Badge className="text-xs bg-red-50 text-red-600 border-red-200 hover:bg-red-50">Absent</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Not Marked</Badge>;
  }
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function PaymentReviewModal({ open, onOpenChange, paymentId, onActionComplete }: PaymentReviewModalProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');

  // Reject mode
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Mark paid mode
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidRemarks, setPaidRemarks] = useState('');

  // Delete mode
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (open && paymentId) {
      fetchDetail();
    }
  }, [open, paymentId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    const res = await getPaymentDetail(paymentId);
    if (res && 'error' in res && res.error) {
      setError(res.error as string);
    } else {
      setDetail(res);
    }
    setLoading(false);
  };

  const handleAction = async (action: string) => {
    setActionLoading(action);
    setError('');
    let res: any;

    try {
      switch (action) {
        case 'approve':
          res = await approvePayment(paymentId);
          break;
        case 'reject':
          res = await rejectPayment(paymentId, rejectReason || undefined);
          setRejecting(false);
          setRejectReason('');
          break;
        case 'markPaid':
          res = await markPaymentPaid(paymentId, paidDate, paidRemarks || undefined);
          setMarkingPaid(false);
          setPaidRemarks('');
          break;
        case 'update':
          const numAmount = parseFloat(editAmount);
          if (isNaN(numAmount) || numAmount < 0) {
            setError('Please enter a valid amount');
            setActionLoading(null);
            return;
          }
          res = await updatePayment(paymentId, numAmount, 'Updated by admin');
          setEditing(false);
          break;
        case 'delete':
          if (!deletePassword) {
            setError('Password is required to delete');
            setActionLoading(null);
            return;
          }
          res = await deletePayment(paymentId, deletePassword);
          if (!res?.error) {
            onOpenChange(false);
            onActionComplete?.();
            router.refresh();
            setActionLoading(null);
            return;
          }
          break;
      }

      if (res?.error) {
        setError(res.error);
      } else {
        await fetchDetail();
        onActionComplete?.();
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }

    setActionLoading(null);
  };

  const resetModes = () => {
    setEditing(false);
    setRejecting(false);
    setMarkingPaid(false);
    setDeleting(false);
    setDeletePassword('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetModes(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-lg">Payment Review</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error && !detail ? (
          <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 my-4">
            {error}
          </div>
        ) : detail ? (
          <div className="space-y-6 pt-2">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 font-medium">
                {error}
              </div>
            )}

            {/* Payment Details */}
            <div className="grid grid-cols-[140px_1fr] gap-y-3.5 gap-x-4 text-sm">
              <span className="text-muted-foreground font-medium">Employee</span>
              <span className="font-semibold">{detail.employeeName}</span>

              <span className="text-muted-foreground font-medium">Date</span>
              <span className="font-medium">{detail.date ? format(new Date(detail.date), 'd MMMM yyyy') : '-'}</span>

              <span className="text-muted-foreground font-medium">Branch</span>
              <span className="font-medium">{detail.branch}</span>

              <span className="text-muted-foreground font-medium">Shift</span>
              <span className="font-medium">{detail.shiftType}</span>

              <span className="text-muted-foreground font-medium">Attendance</span>
              <span>{attendanceBadge(detail.attendance)}</span>

              <span className="text-muted-foreground font-medium">Amount</span>
              <span className="font-bold text-lg">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      type="number"
                      className="h-8 w-28 text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-emerald-600"
                      onClick={() => handleAction('update')}
                      disabled={actionLoading === 'update'}
                    >
                      {actionLoading === 'update' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400"
                      onClick={() => setEditing(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-emerald-600">₹{detail.amount.toLocaleString()}</span>
                )}
              </span>

              <span className="text-muted-foreground font-medium">Status</span>
              <span>{statusBadge(detail.status)}</span>

              {detail.requestedAt && (
                <>
                  <span className="text-muted-foreground font-medium">Requested At</span>
                  <span className="text-xs font-medium">{format(new Date(detail.requestedAt), 'd MMM yyyy, h:mm a')}</span>
                </>
              )}

              {detail.requestedRemarks && (
                <>
                  <span className="text-muted-foreground font-medium">Employee Remarks</span>
                  <span className="text-xs bg-slate-50 p-2 rounded-md border">{detail.requestedRemarks}</span>
                </>
              )}

              {detail.paymentDate && (
                <>
                  <span className="text-muted-foreground font-medium">Payment Date</span>
                  <span className="font-medium">{format(new Date(detail.paymentDate), 'd MMMM yyyy')}</span>
                </>
              )}

              {detail.remarks && (
                <>
                  <span className="text-muted-foreground font-medium">Admin Remarks</span>
                  <span className="text-xs">{detail.remarks}</span>
                </>
              )}
            </div>

            {/* 1-Week Edit Window Indicator (hidden for paid payments) */}
            {detail.status !== 'paid' && (
              <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-medium ${
                detail.canEdit
                  ? 'bg-blue-50/50 border-blue-200 text-blue-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                {detail.canEdit ? (
                  <>
                    <Clock className="h-3.5 w-3.5" />
                    Edit window: {detail.editTimeRemaining}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Edit Window Expired
                  </>
                )}
              </div>
            )}

            {/* Reject Reason Input */}
            {rejecting && (
              <div className="space-y-2 p-4 border rounded-lg bg-red-50/30">
                <Label className="text-sm font-medium">Rejection Reason (Optional)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  className="min-h-[70px] text-sm resize-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading === 'reject'}
                  >
                    {actionLoading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                    Confirm Reject
                  </Button>
                </div>
              </div>
            )}

            {/* Mark Paid Input */}
            {markingPaid && (
              <div className="space-y-3 p-4 border rounded-lg bg-emerald-50/30">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Date</Label>
                  <Input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="w-[200px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Remarks (Optional)</Label>
                  <Textarea
                    value={paidRemarks}
                    onChange={(e) => setPaidRemarks(e.target.value)}
                    placeholder="Payment remarks..."
                    className="min-h-[60px] text-sm resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setMarkingPaid(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAction('markPaid')}
                    disabled={actionLoading === 'markPaid'}
                  >
                    {actionLoading === 'markPaid' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    Confirm Payment
                  </Button>
                </div>
              </div>
            )}

            {/* Delete Input */}
            {deleting && (
              <div className="space-y-3 p-4 border rounded-lg bg-red-50/30 border-red-200">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-700">Admin Password Required</Label>
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password to confirm deletion"
                    className="w-full text-sm border-red-200 focus-visible:ring-red-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setDeleting(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleAction('delete')}
                    disabled={actionLoading === 'delete' || !deletePassword}
                  >
                    {actionLoading === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                    Confirm Delete
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!rejecting && !markingPaid && !deleting && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {/* Accept — only for requested */}
                {detail.status === 'requested' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { resetModes(); handleAction('approve'); }}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    Accept
                  </Button>
                )}

                {/* Reject — only for requested */}
                {detail.status === 'requested' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => { resetModes(); setRejecting(true); }}
                    disabled={!!actionLoading}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                )}

                {/* Mark Paid — for approved, requested, and not_requested */}
                {(detail.status === 'approved' || detail.status === 'requested' || detail.status === 'not_requested') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => { resetModes(); setMarkingPaid(true); setPaidDate(new Date().toISOString().split('T')[0]); }}
                    disabled={!!actionLoading}
                  >
                    <IndianRupee className="h-3.5 w-3.5 mr-1" />
                    Mark Paid
                  </Button>
                )}

                {/* Update Amount — if within edit window */}
                {detail.canEdit && detail.status !== 'paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { resetModes(); setEditing(true); setEditAmount(detail.amount.toString()); }}
                    disabled={!!actionLoading}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Update Amount
                  </Button>
                )}

                {/* Delete — always allowed but requires password */}
                {detail.status !== 'paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => { resetModes(); setDeleting(true); }}
                    disabled={!!actionLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            )}

            {/* Payment History (from audit logs) */}
            {detail.history && detail.history.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Payment History
                </h4>
                <div className="space-y-2">
                  {detail.history.map((log: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-xs p-2.5 rounded-md bg-slate-50/60 border">
                      <div className="flex-1">
                        <span className="font-semibold">{formatAction(log.action)}</span>
                        <span className="text-muted-foreground"> by {log.by}</span>
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.at), 'd MMM, h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
