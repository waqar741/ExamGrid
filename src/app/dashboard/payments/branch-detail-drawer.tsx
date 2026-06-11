'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { getBranchDateDetail, markPaid } from '@/app/actions/payments';
import { MarkBranchPaidModal } from './mark-branch-paid-modal';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { BranchDateSettlement } from '@/app/actions/payments';

interface BranchDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: BranchDateSettlement | null;
}

export function BranchDetailDrawer({ open, onOpenChange, settlement }: BranchDetailDrawerProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [branchName, setBranchName] = useState('');
  const [totalPayable, setTotalPayable] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && settlement) {
      fetchDetail();
    }
  }, [open, settlement]);

  const fetchDetail = async () => {
    if (!settlement) return;
    setLoading(true);
    const result = await getBranchDateDetail(settlement.branchId, settlement.shiftDate);
    setEmployees(result.employees);
    setBranchName(result.branchName);
    setTotalPayable(result.totalPayable);
    setTotalPaid(result.totalPaid);
    setLoading(false);
  };

  const handleMarkSinglePaid = async (paymentId: string) => {
    setMarkingId(paymentId);
    const today = new Date().toISOString().split('T')[0];
    await markPaid(paymentId, today, 'Individual settlement');
    await fetchDetail();
    setMarkingId(null);
    router.refresh();
  };

  const pendingCount = employees.filter(e => e.paymentStatus === 'pending').length;
  const pendingAmount = totalPayable - totalPaid;

  const attBadge = (att: string) => {
    switch (att) {
      case 'present':
        return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Present</Badge>;
      case 'late':
        return <Badge className="text-[10px] bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Late</Badge>;
      case 'absent':
        return <Badge className="text-[10px] bg-red-100 text-red-600 hover:bg-red-100 border-red-200">Absent</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Not Marked</Badge>;
    }
  };

  const payBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Paid</Badge>;
      case 'pending':
        return <Badge className="text-[10px] bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Pending</Badge>;
      case 'n/a':
        return <Badge variant="outline" className="text-[10px] text-muted-foreground">N/A</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-base">
            {settlement && format(new Date(settlement.shiftDate), 'MMM d, yyyy')} → {branchName}
          </SheetTitle>
          {settlement && (
            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
              <span>Present: <strong className="text-emerald-600">{settlement.present}</strong></span>
              <span>Absent: <strong className="text-red-500">{settlement.absent}</strong></span>
              <span>Payable: <strong>₹{totalPayable.toLocaleString()}</strong></span>
              <span>Paid: <strong className="text-emerald-600">₹{totalPaid.toLocaleString()}</strong></span>
            </div>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Shift</TableHead>
                    <TableHead className="text-xs">Attendance</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-16 text-muted-foreground text-xs">
                        No assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => (
                      <TableRow key={emp.assignmentId}>
                        <TableCell className="text-xs font-medium">{emp.employeeName}</TableCell>
                        <TableCell className="text-xs">{emp.shiftType}</TableCell>
                        <TableCell>{attBadge(emp.attendance)}</TableCell>
                        <TableCell className="text-xs text-right font-bold">
                          {emp.amount > 0 ? `₹${emp.amount.toLocaleString()}` : '₹0'}
                        </TableCell>
                        <TableCell>{payBadge(emp.paymentStatus)}</TableCell>
                        <TableCell className="text-right">
                          {emp.paymentStatus === 'pending' && emp.paymentId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              disabled={markingId === emp.paymentId}
                              onClick={() => handleMarkSinglePaid(emp.paymentId)}
                            >
                              {markingId === emp.paymentId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Pay
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Mark Branch Paid */}
              {pendingCount > 0 && settlement && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="text-xs">
                    <p className="font-medium">{pendingCount} pending payment{pendingCount !== 1 ? 's' : ''}</p>
                    <p className="text-muted-foreground">₹{pendingAmount.toLocaleString()} remaining</p>
                  </div>
                  <MarkBranchPaidModal
                    branchId={settlement.branchId}
                    branchName={branchName}
                    shiftDate={settlement.shiftDate}
                    employeeCount={pendingCount}
                    totalAmount={pendingAmount}
                    onSuccess={() => { fetchDetail(); router.refresh(); }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
