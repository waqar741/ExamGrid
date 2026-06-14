'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { format } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';
import { useDebounce } from '@/lib/use-debounce';
import { PaymentReviewModal } from './payment-review-modal';
import {
  IndianRupee,
  Clock,
  CheckCircle2,
  Eye,
  FileSearch,
  AlertCircle,
} from 'lucide-react';
import type { AdminPaymentRequest, AdminPaymentSummary } from '@/app/actions/payments';

interface PaymentsClientProps {
  initialData: AdminPaymentRequest[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  summary: AdminPaymentSummary;
  branches: any[];
  filters: {
    search: string;
    dateFrom: string;
    dateTo: string;
    branch: string;
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
    default:
      return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>;
  }
}

export function PaymentsClient({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  summary,
  branches,
  filters,
}: PaymentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(filters.search);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);
  const [branchId, setBranchId] = useState(filters.branch || 'all');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
  const debouncedSearch = useDebounce(search, 400);

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

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

  useEffect(() => {
    pushParams({ search: debouncedSearch });
  }, [debouncedSearch]);

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

  const openReview = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setReviewOpen(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3.5 border rounded-xl bg-card shadow-sm">
          <div className="p-2.5 rounded-lg bg-blue-50">
            <FileSearch className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Pending Reviews</p>
            <p className="text-lg font-bold">{summary.pendingReviews}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 border rounded-xl bg-card shadow-sm">
          <div className="p-2.5 rounded-lg bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Requested Amount</p>
            <p className="text-lg font-bold">₹{summary.totalRequested.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 border rounded-xl bg-card shadow-sm">
          <div className="p-2.5 rounded-lg bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Approved Amount</p>
            <p className="text-lg font-bold">₹{summary.totalApproved.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 border rounded-xl bg-card shadow-sm">
          <div className="p-2.5 rounded-lg bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Paid Amount</p>
            <p className="text-lg font-bold text-emerald-600">₹{summary.totalPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 border rounded-xl bg-card shadow-sm">
        <Input
          type="search"
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-[200px] text-xs"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); pushParams({ dateFrom: e.target.value, dateTo }); }}
          className="w-full sm:w-[140px] text-xs"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); pushParams({ dateFrom, dateTo: e.target.value }); }}
          className="w-full sm:w-[140px] text-xs"
        />
        <Select value={branchId} onValueChange={(val) => { setBranchId(val || 'all'); pushParams({ branch: val || 'all' }); }}>
          <SelectTrigger className="w-full sm:w-[160px] text-xs h-8 bg-transparent">
            <span className="flex-1 text-left truncate">
              {branchId === 'all' ? 'All Branches' : branches.find((b: any) => b.id === branchId)?.name || 'All Branches'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Branches</SelectItem>
            {branches.map((b: any) => (
              <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || 'all'); pushParams({ status: val || 'all' }); }}>
          <SelectTrigger className="w-full sm:w-[160px] text-xs h-8 bg-transparent">
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

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/60">
            <TableRow>
              <TableHead className="text-xs">Employee</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Branch</TableHead>
              <TableHead className="text-xs">Shift</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-sm">
                  No payment requests found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((p) => (
                <TableRow key={p.paymentId} className="hover:bg-muted/10">
                  <TableCell className="text-xs font-medium">{p.employeeName}</TableCell>
                  <TableCell className="text-xs">
                    {p.date ? format(new Date(p.date), 'd MMM yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-xs">{p.branch}</TableCell>
                  <TableCell className="text-xs">{p.shiftType}</TableCell>
                  <TableCell className="text-xs text-right font-bold">₹{p.amount.toLocaleString()}</TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => openReview(p.paymentId)}
                    >
                      {p.status === 'requested' ? (
                        <>
                          <FileSearch className="h-3 w-3 mr-1" />
                          Review
                        </>
                      ) : p.status === 'approved' ? (
                        <>
                          <IndianRupee className="h-3 w-3 mr-1" />
                          Review
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {initialData.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground border rounded-xl bg-card text-sm shadow-sm">
            No payment requests found.
          </div>
        ) : (
          initialData.map((p) => (
            <div
              key={p.paymentId}
              className="flex flex-col gap-3 p-4 border rounded-xl bg-card text-xs shadow-sm cursor-pointer hover:bg-muted/5 active:bg-muted/10 transition-colors"
              onClick={() => openReview(p.paymentId)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{p.employeeName}</p>
                  <p className="text-muted-foreground">{p.date ? format(new Date(p.date), 'd MMM yyyy') : '-'}</p>
                </div>
                {statusBadge(p.status)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-muted-foreground text-[10px]">Branch</p>
                  <p className="font-medium">{p.branch}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Shift</p>
                  <p className="font-medium">{p.shiftType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Amount</p>
                  <p className="font-bold">₹{p.amount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Review Modal */}
      {selectedPaymentId && (
        <PaymentReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          paymentId={selectedPaymentId}
          onActionComplete={() => router.refresh()}
        />
      )}
    </div>
  );
}
