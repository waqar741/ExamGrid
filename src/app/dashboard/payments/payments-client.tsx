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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';
import { useDebounce } from '@/lib/use-debounce';
import { MarkPaidModal } from './mark-paid-modal';

interface PaymentsClientProps {
  initialData: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
}

export function PaymentsClient({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  isAdmin,
}: PaymentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard/payments?${params.toString()}`);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-md bg-card">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search by employee or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs"
          />
        </div>
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Date</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center h-24 text-muted-foreground text-xs">
                  No payment records found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/10">
                  <TableCell className="font-medium text-xs">
                    {payment.assignments?.employees?.users?.full_name}
                  </TableCell>
                  <TableCell className="text-xs">{payment.assignments?.events?.branches?.name}</TableCell>
                  <TableCell className="font-bold text-xs">₹{payment.amount}</TableCell>
                  <TableCell>
                    <Badge variant={
                      payment.payment_status === 'paid' ? 'default' :
                      payment.payment_status === 'pending' ? 'secondary' : 'destructive'
                    } className="text-[10px] capitalize">
                      {payment.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {payment.payment_date ? format(new Date(payment.payment_date), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {payment.payment_status === 'pending' && (
                        <MarkPaidModal paymentId={payment.id} />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {initialData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card text-xs">No payment records found.</div>
        ) : (
          initialData.map((payment) => (
            <div key={payment.id} className="flex flex-col gap-2 p-4 border rounded-md bg-card text-xs">
              <div className="flex justify-between items-start">
                <div className="font-semibold text-lg">{payment.assignments?.employees?.users?.full_name}</div>
                <Badge variant={
                  payment.payment_status === 'paid' ? 'default' :
                  payment.payment_status === 'pending' ? 'secondary' : 'destructive'
                } className="text-[10px] capitalize">
                  {payment.payment_status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{payment.assignments?.events?.branches?.name}</div>
              <div className="font-bold text-green-600 text-lg mt-1">₹{payment.amount}</div>
              <div className="text-xs text-muted-foreground">
                Date: {payment.payment_date ? format(new Date(payment.payment_date), 'MMM d, yyyy') : 'Pending'}
              </div>
              {isAdmin && payment.payment_status === 'pending' && (
                <div className="mt-2 text-right">
                  <MarkPaidModal paymentId={payment.id} />
                </div>
              )}
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
    </div>
  );
}
