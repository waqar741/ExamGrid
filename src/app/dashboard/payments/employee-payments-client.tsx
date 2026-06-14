'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { TablePagination } from '@/components/ui/table-pagination';
import { RequestPaymentModal } from './request-payment-modal';
import { MissingShiftModal } from './missing-shift-modal';
import { IndianRupee, Clock, CheckCircle2, TrendingUp, Eye, CalendarPlus } from 'lucide-react';
import type { EmployeePaymentItem, EmployeePaymentSummary } from '@/app/actions/payments';

interface EmployeePaymentsClientProps {
  initialData: EmployeePaymentItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  summary: EmployeePaymentSummary;
  branches: any[];
  filters: {
    dateFrom: string;
    dateTo: string;
    status: string;
  };
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not_requested', label: 'Not Requested' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'not_requested':
      return <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">Not Requested</Badge>;
    case 'requested':
      return <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">Requested</Badge>;
    case 'approved':
      return <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Approved</Badge>;
    case 'rejected':
      return <Badge className="text-[10px] bg-red-50 text-red-600 border-red-200 hover:bg-red-50">Rejected</Badge>;
    case 'paid':
      return <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Paid</Badge>;
    case 'absent':
      return <Badge variant="outline" className="text-[10px] bg-red-50 text-red-500 border-red-200">Absent</Badge>;
    case 'not_marked':
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Marked</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>;
  }
}

export function EmployeePaymentsClient({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  summary,
  branches,
  filters,
}: EmployeePaymentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [missingShiftModalOpen, setMissingShiftModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<EmployeePaymentItem | null>(null);

  const pushParams = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    for (const [k, v] of Object.entries(overrides)) {
      if (v && v !== 'all' && v !== '') {
        params.set(k, v);
      } else {
        params.delete(k);
      }
    }
    router.push(`/dashboard/payments?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/payments?${params.toString()}`);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('pageSize', String(size));
    router.push(`/dashboard/payments?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">Track your shift payments and request new payments.</p>
        </div>
        <Button 
          onClick={() => setMissingShiftModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
          <CalendarPlus className="h-4 w-4" />
          Request Missing Shift
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-4 border rounded-xl bg-card shadow-sm">
          <div className="p-2.5 rounded-lg bg-slate-100">
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Total Earned</p>
            <p className="text-lg font-bold">₹{summary.totalEarned.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 border rounded-xl bg-card shadow-sm">
          <div className="p-2.5 rounded-lg bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Total Paid</p>
            <p className="text-lg font-bold text-emerald-600">₹{summary.totalPaid.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 border rounded-xl bg-card shadow-sm">
          <div className="p-2.5 rounded-lg bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Pending</p>
            <p className="text-lg font-bold text-yellow-600">₹{summary.totalPending.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 border rounded-xl bg-card shadow-sm">
          <div className="p-2.5 rounded-lg bg-blue-50">
            <IndianRupee className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Shifts Worked</p>
            <p className="text-lg font-bold">{summary.totalShifts}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 border rounded-xl bg-card shadow-sm">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); pushParams({ dateFrom: e.target.value, dateTo }); }}
          className="w-full sm:w-[150px] text-xs"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); pushParams({ dateFrom, dateTo: e.target.value }); }}
          className="w-full sm:w-[150px] text-xs"
          placeholder="To"
        />
        <Select
          value={statusFilter}
          onValueChange={(val) => { setStatusFilter(val || 'all'); pushParams({ status: val || 'all' }); }}
        >
          <SelectTrigger className="w-full sm:w-[170px] text-xs h-8 bg-transparent">
            <span className="flex-1 text-left truncate">
              {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || 'All Statuses'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/60">
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Branch</TableHead>
                <TableHead className="text-xs">Shift</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Payment Status</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground text-sm">
                    No payment records found.
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-medium">
                      {p.date ? format(new Date(p.date), 'd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{p.branch}</TableCell>
                    <TableCell className="text-xs">{p.shiftType}</TableCell>
                    <TableCell className="text-xs text-right font-bold">
                      {p.amount > 0 ? `₹${p.amount.toLocaleString()}` : '₹0'}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-right">
                      {p.status === 'not_requested' && p.amount > 0 && (p.attendance === 'present' || p.attendance === 'late') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-3"
                          onClick={() => { setSelectedPayment(p); setRequestModalOpen(true); }}
                        >
                          Request Payment
                        </Button>
                      )}
                      {(p.status === 'requested' || p.status === 'approved' || p.status === 'paid' || p.status === 'rejected') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-3 text-muted-foreground"
                          onClick={() => { setSelectedPayment(p); setViewModalOpen(true); }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {p.status === 'requested' ? 'View Request' : 'View'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalCount > 0 && (
          <div className="border-t">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      {/* Request Payment Modal */}
      {selectedPayment && (
        <RequestPaymentModal
          open={requestModalOpen}
          onOpenChange={setRequestModalOpen}
          payment={selectedPayment}
        />
      )}

      {/* Missing Shift Modal */}
      <MissingShiftModal
        isOpen={missingShiftModalOpen}
        onClose={() => setMissingShiftModalOpen(false)}
        branches={branches}
      />

      {/* View Details Modal */}
      {selectedPayment && viewModalOpen && (
        <ViewPaymentModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          payment={selectedPayment}
        />
      )}
    </div>
  );
}

// ─── Simple View Modal for employees ─────────────────────────────────
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function ViewPaymentModal({ open, onOpenChange, payment }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payment: EmployeePaymentItem;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm py-4">
          <span className="text-muted-foreground font-medium">Date</span>
          <span className="font-medium">{payment.date ? format(new Date(payment.date), 'd MMMM yyyy') : '-'}</span>

          <span className="text-muted-foreground font-medium">Branch</span>
          <span className="font-medium">{payment.branch}</span>

          <span className="text-muted-foreground font-medium">Shift</span>
          <span className="font-medium">{payment.shiftType}</span>

          <span className="text-muted-foreground font-medium">Amount</span>
          <span className="font-bold text-emerald-600">₹{payment.amount.toLocaleString()}</span>

          <span className="text-muted-foreground font-medium">Status</span>
          <span>{statusBadge(payment.status)}</span>

          {payment.paymentDate && (
            <>
              <span className="text-muted-foreground font-medium">Payment Date</span>
              <span className="font-medium">{format(new Date(payment.paymentDate), 'd MMMM yyyy')}</span>
            </>
          )}

          {payment.requestedAt && (
            <>
              <span className="text-muted-foreground font-medium">Requested At</span>
              <span className="font-medium text-xs">{format(new Date(payment.requestedAt), 'd MMM yyyy, h:mm a')}</span>
            </>
          )}

          {payment.remarks && (
            <>
              <span className="text-muted-foreground font-medium">Remarks</span>
              <span className="text-xs">{payment.remarks}</span>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
