'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';
import { useDebounce } from '@/lib/use-debounce';
import { BranchDetailDrawer } from './branch-detail-drawer';
import { IndianRupee, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BranchDateSettlement, SettlementSummary } from '@/app/actions/payments';

interface PaymentsClientProps {
  initialData: BranchDateSettlement[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  summary: SettlementSummary;
  branches: any[];
}

export function PaymentsClient({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  summary,
  branches,
}: PaymentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [branchId, setBranchId] = useState(searchParams.get('branch') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const debouncedSearch = useDebounce(search, 400);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<BranchDateSettlement | null>(null);

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

  const totalPages = Math.ceil(totalCount / pageSize);

  const statusBadge = (s: string) => {
    switch (s) {
      case 'paid':
        return <Badge className="text-[10px] capitalize bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Paid</Badge>;
      case 'partially_paid':
        return <Badge className="text-[10px] capitalize bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">Partial</Badge>;
      default:
        return <Badge className="text-[10px] capitalize bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Pending</Badge>;
    }
  };

  const openDrawer = (settlement: BranchDateSettlement) => {
    setSelectedSettlement(settlement);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
          <div className="p-2 rounded-md bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Pending Amount</p>
            <p className="text-sm font-bold">₹{summary.totalPending.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
          <div className="p-2 rounded-md bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Paid Amount</p>
            <p className="text-sm font-bold">₹{summary.totalPaid.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
          <div className="p-2 rounded-md bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Pending Settlements</p>
            <p className="text-sm font-bold">{summary.pendingSettlements}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
          <div className="p-2 rounded-md bg-blue-50">
            <IndianRupee className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Paid Settlements</p>
            <p className="text-sm font-bold">{summary.paidSettlements}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 border rounded-md bg-card">
        <Input
          type="search"
          placeholder="Search branch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-[180px] text-xs"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); pushParams({ dateFrom: e.target.value, dateTo }); }}
          className="w-full sm:w-[140px] text-xs"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); pushParams({ dateFrom, dateTo: e.target.value }); }}
          className="w-full sm:w-[140px] text-xs"
          placeholder="To"
        />
        <Select value={branchId} onValueChange={(val) => { setBranchId(val || 'all'); pushParams({ branch: val || 'all' }); }}>
          <SelectTrigger className="w-full sm:w-[150px] text-xs h-8 bg-transparent">
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
        <Select value={status} onValueChange={(val) => { setStatus(val || 'all'); pushParams({ status: val || 'all' }); }}>
          <SelectTrigger className="w-full sm:w-[150px] text-xs h-8 bg-transparent">
            <span className="flex-1 text-left truncate">
              {status === 'all' ? 'All Statuses' : status === 'partially_paid' ? 'Partially Paid' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
            <SelectItem value="pending" className="text-xs">Pending</SelectItem>
            <SelectItem value="partially_paid" className="text-xs">Partially Paid</SelectItem>
            <SelectItem value="paid" className="text-xs">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-center">Assigned</TableHead>
              <TableHead className="text-center">Present</TableHead>
              <TableHead className="text-center">Absent</TableHead>
              <TableHead className="text-center">Payable</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground text-xs">
                  No settlement records found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((s) => (
                <TableRow
                  key={`${s.shiftDate}_${s.branchId}`}
                  className="hover:bg-muted/10 cursor-pointer"
                  onClick={() => openDrawer(s)}
                >
                  <TableCell className="font-medium text-xs">
                    {format(new Date(s.shiftDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-xs font-medium">{s.branchName}</TableCell>
                  <TableCell className="text-xs text-center">{s.assigned}</TableCell>
                  <TableCell className="text-xs text-center text-emerald-600 font-medium">{s.present}</TableCell>
                  <TableCell className="text-xs text-center text-red-500 font-medium">{s.absent}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{s.payable}</TableCell>
                  <TableCell className="text-xs text-right font-bold">₹{s.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {initialData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card text-xs">No settlement records found.</div>
        ) : (
          initialData.map((s) => (
            <div
              key={`${s.shiftDate}_${s.branchId}`}
              className="flex flex-col gap-2 p-4 border rounded-md bg-card text-xs cursor-pointer hover:bg-muted/5"
              onClick={() => openDrawer(s)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{s.branchName}</p>
                  <p className="text-muted-foreground">{format(new Date(s.shiftDate), 'MMM d, yyyy')}</p>
                </div>
                {statusBadge(s.status)}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-1 text-center">
                <div>
                  <p className="text-muted-foreground text-[10px]">Assigned</p>
                  <p className="font-medium">{s.assigned}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Present</p>
                  <p className="font-medium text-emerald-600">{s.present}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Absent</p>
                  <p className="font-medium text-red-500">{s.absent}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Payable</p>
                  <p className="font-medium">{s.payable}</p>
                </div>
              </div>
              <div className="flex justify-end mt-1">
                <p className="font-bold text-sm">₹{s.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Detail Drawer */}
      <BranchDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        settlement={selectedSettlement}
      />
    </div>
  );
}
