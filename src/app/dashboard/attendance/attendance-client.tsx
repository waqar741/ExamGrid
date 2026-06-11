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
import { MarkAttendanceAction } from './mark-attendance-action';

interface AttendanceClientProps {
  initialData: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
}

export function AttendanceClient({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  isAdmin,
}: AttendanceClientProps) {
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
    router.push(`/dashboard/attendance?${params.toString()}`);
  }, [debouncedSearch]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/attendance?${params.toString()}`);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('pageSize', String(size));
    router.push(`/dashboard/attendance?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-md bg-card">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search by employee, branch, or shift..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center h-24 text-muted-foreground text-xs">
                  No attendance records to process.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((assignment) => {
                const attStatus = assignment.attendance?.[0]?.attendance_status || 'pending';
                return (
                  <TableRow key={assignment.id} className="hover:bg-muted/10">
                    <TableCell className="text-xs">
                      {assignment.shift_schedules?.shift_date && format(new Date(assignment.shift_schedules.shift_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-xs">{assignment.shift_schedules?.branches?.name}</TableCell>
                    <TableCell className="text-xs">{assignment.shift_schedules?.shift_templates?.name}</TableCell>
                    <TableCell className="font-medium text-xs">
                      {assignment.employees?.users?.full_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        attStatus === 'present' ? 'default' :
                        attStatus === 'late' ? 'secondary' :
                        attStatus === 'absent' ? 'destructive' : 'outline'
                      } className="text-[10px] capitalize">
                        {attStatus}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <MarkAttendanceAction assignmentId={assignment.id} currentStatus={attStatus} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
