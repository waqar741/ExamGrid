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
import Link from 'next/link';
import { TablePagination } from '@/components/ui/table-pagination';
import { useDebounce } from '@/lib/use-debounce';
import { CreateEmployeeModal } from './create-employee-modal';

interface EmployeesClientProps {
  initialData: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
}

export function EmployeesClient({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  isAdmin,
}: EmployeesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 400);

  // Trigger search navigation on debounced input change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard/employees?${params.toString()}`);
  }, [debouncedSearch]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('pageSize', String(size));
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border rounded-md bg-card">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search by name, code, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs"
          />
        </div>
        {isAdmin && <CreateEmployeeModal />}
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground text-xs">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                  <TableCell className="font-medium text-xs">{emp.users?.full_name}</TableCell>
                  <TableCell className="text-xs">{emp.users?.email}</TableCell>
                  <TableCell className="text-xs">{emp.phone}</TableCell>
                  <TableCell>
                    <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/employees/${emp.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {initialData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card text-xs">No employees found.</div>
        ) : (
          initialData.map((emp) => (
            <div key={emp.id} className="flex flex-col gap-2 p-4 border rounded-md bg-card text-xs">
              <div className="flex justify-between items-start">
                <div className="font-semibold">{emp.users?.full_name}</div>
                <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{emp.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Code: {emp.employee_code}</div>
              <div className="text-xs text-muted-foreground">{emp.users?.email}</div>
              <div className="text-xs text-muted-foreground">{emp.phone}</div>
              <div className="mt-2">
                <Link href={`/dashboard/employees/${emp.id}`}>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs">View Details</Button>
                </Link>
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
    </div>
  );
}
