'use client';

import { useState } from 'react';
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
import { useDebounce } from '@/lib/use-debounce';
import { MarkAttendanceAction } from './mark-attendance-action';
import { Loader2, CalendarClock, User } from 'lucide-react';
import { getAssignmentsForAttendance } from '@/app/actions/attendance';

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
  pageSize,
  isAdmin,
}: AttendanceClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(totalCount);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length < totalCount);

  // Load More function
  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const res = await getAssignmentsForAttendance({ page: nextPage, pageSize, search: debouncedSearch });
    
    setData(prev => [...prev, ...res.data]);
    setPage(nextPage);
    setHasMore([...data, ...res.data].length < res.total);
    setLoading(false);
  };

  // Client-side search filtering (since initialData has the first page)
  // For a real app, you'd trigger a fresh server fetch on debouncedSearch change
  const filteredData = data.filter((assignment) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const empName = assignment.employees?.users?.full_name?.toLowerCase() || '';
    const branchName = assignment.shift_schedules?.branches?.name?.toLowerCase() || '';
    const shiftName = assignment.shift_schedules?.shift_templates?.name?.toLowerCase() || '';
    return empName.includes(s) || branchName.includes(s) || shiftName.includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl bg-card shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search by employee, branch, or shift..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 bg-slate-50"
          />
        </div>
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Date & Shift</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center h-32 text-muted-foreground text-sm">
                  No attendance records to process.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((assignment) => {
                const attStatus = assignment.attendance?.[0]?.attendance_status || 'pending';
                return (
                  <TableRow key={assignment.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 text-sm">
                          {assignment.shift_schedules?.shift_date && format(new Date(assignment.shift_schedules.shift_date), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">{assignment.shift_schedules?.shift_templates?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{assignment.shift_schedules?.branches?.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-slate-900 text-sm">
                        {assignment.employees?.users?.full_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        attStatus === 'present' ? 'default' :
                        attStatus === 'late' ? 'secondary' :
                        attStatus === 'absent' ? 'destructive' :
                        attStatus === 'skipped' ? 'outline' : 'outline'
                      } className={`text-[10px] capitalize ${attStatus === 'present' ? 'bg-blue-600' : ''}`}>
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

      {/* Mobile View */}
      <div className="flex flex-col md:hidden border rounded-md overflow-hidden bg-white shadow-sm">
        {filteredData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-xs">
            No attendance records found.
          </div>
        ) : (
          filteredData.map((assignment) => {
            const attStatus = assignment.attendance?.[0]?.attendance_status || 'pending';
            return (
              <div key={assignment.id} className="flex flex-col p-3 border-b last:border-b-0 gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 text-sm leading-tight">
                      {assignment.employees?.users?.full_name}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      {assignment.shift_schedules?.branches?.name} • {assignment.shift_schedules?.shift_templates?.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge variant={
                        attStatus === 'present' ? 'default' :
                        attStatus === 'late' ? 'secondary' :
                        attStatus === 'absent' ? 'destructive' :
                        attStatus === 'skipped' ? 'outline' : 'outline'
                      } className={`text-[9px] leading-none px-1.5 py-0.5 mt-1 capitalize ${attStatus === 'present' ? 'bg-blue-600' : ''}`}>
                      {attStatus}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    {assignment.shift_schedules?.shift_date && format(new Date(assignment.shift_schedules.shift_date), 'MMM d, yyyy')}
                  </div>
                  {isAdmin && (
                    <div className="scale-90 origin-right">
                      <MarkAttendanceAction assignmentId={assignment.id} currentStatus={attStatus} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4 pb-8">
          <Button variant="outline" onClick={loadMore} disabled={loading} className="min-w-[200px] bg-white border-dashed border-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Loading...' : 'Load More Records'}
          </Button>
        </div>
      )}
    </div>
  );
}
