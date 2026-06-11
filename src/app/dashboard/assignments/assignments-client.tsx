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
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';
import { useDebounce } from '@/lib/use-debounce';
import { ReplaceAssignmentModal } from './replace-assignment-modal';
import { RemoveAssignmentModal } from './remove-assignment-modal';

interface AssignmentsClientProps {
  initialData: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
  branches: any[];
  allEmployees: any[];
}

export function AssignmentsClient({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  isAdmin,
  branches,
  allEmployees,
}: AssignmentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialBranch = searchParams.get('branchId') || 'all';
  const initialStatus = searchParams.get('status') || 'all';

  const [search, setSearch] = useState(initialSearch);
  const [branchId, setBranchId] = useState(initialBranch);
  const [status, setStatus] = useState(initialStatus);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard/assignments?${params.toString()}`);
  }, [debouncedSearch]);

  const handleBranchChange = (val: string) => {
    setBranchId(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (val && val !== 'all') {
      params.set('branchId', val);
    } else {
      params.delete('branchId');
    }
    router.push(`/dashboard/assignments?${params.toString()}`);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (val && val !== 'all') {
      params.set('status', val);
    } else {
      params.delete('status');
    }
    router.push(`/dashboard/assignments?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/assignments?${params.toString()}`);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('pageSize', String(size));
    router.push(`/dashboard/assignments?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border rounded-md bg-card">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-2xl">
          <Input
            type="search"
            placeholder="Search by employee, branch, or shift..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[260px] text-xs"
          />
          <Select value={branchId} onValueChange={(val) => handleBranchChange(val || 'all')}>
            <SelectTrigger className="w-full sm:w-[150px] text-xs h-8 bg-transparent">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(val) => handleStatusChange(val || 'all')}>
            <SelectTrigger className="w-full sm:w-[150px] text-xs h-8 bg-transparent">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="assigned" className="text-xs">Assigned</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="replaced" className="text-xs">Replaced</SelectItem>
              <SelectItem value="removed" className="text-xs">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Rate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-xs">
                  No assignments found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((assignment) => (
                <TableRow key={assignment.id} className="hover:bg-muted/10">
                  <TableCell className="font-medium text-xs">
                    {assignment.employees?.users?.full_name}
                  </TableCell>
                  <TableCell className="text-xs">{assignment.shift_schedules?.branches?.name}</TableCell>
                  <TableCell className="text-xs">
                    {assignment.shift_schedules?.shift_date && format(new Date(assignment.shift_schedules.shift_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-xs">{assignment.shift_schedules?.shift_templates?.name}</TableCell>
                  <TableCell>
                    <Badge variant={
                      assignment.assignment_status === 'assigned' ? 'default' :
                      assignment.assignment_status === 'completed' ? 'secondary' :
                      assignment.assignment_status === 'replaced' ? 'destructive' : 'outline'
                    } className="text-[10px] capitalize">
                      {assignment.assignment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">₹{assignment.payment_snapshot}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && assignment.assignment_status === 'assigned' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <ReplaceAssignmentModal 
                          assignmentId={assignment.id} 
                          currentEmployeeName={assignment.employees?.users?.full_name}
                          allEmployees={allEmployees}
                        />
                        <RemoveAssignmentModal
                          assignmentId={assignment.id}
                          currentEmployeeName={assignment.employees?.users?.full_name}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
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
