'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { approveAssignment, rejectAssignment } from '@/app/actions/assignments';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, IndianRupee } from 'lucide-react';

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

  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const groupedData = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    initialData.forEach((assignment) => {
      const date = assignment.shift_schedules?.shift_date || 'Unknown Date';
      const branch = assignment.shift_schedules?.branches?.name || 'Unknown Branch';
      
      if (!groups[date]) groups[date] = {};
      if (!groups[date][branch]) groups[date][branch] = [];
      
      groups[date][branch].push(assignment);
    });
    
    // Sort dates descending
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const sortedGroups: Record<string, Record<string, any[]>> = {};
    for (const d of sortedDates) {
      // Sort branches alphabetically
      const sortedBranches = Object.keys(groups[d]).sort((a, b) => a.localeCompare(b));
      sortedGroups[d] = {};
      for (const b of sortedBranches) {
        sortedGroups[d][b] = groups[d][b];
      }
    }
    return sortedGroups;
  }, [initialData]);

  useEffect(() => {
    if (Object.keys(groupedData).length > 0) {
      if (!selectedDate || !groupedData[selectedDate]) {
        const firstDate = Object.keys(groupedData)[0];
        setSelectedDate(firstDate);
        setSelectedBranch(Object.keys(groupedData[firstDate])[0]);
      } else if (selectedDate && (!selectedBranch || !groupedData[selectedDate][selectedBranch])) {
        setSelectedBranch(Object.keys(groupedData[selectedDate])[0]);
      }
    }
  }, [groupedData, selectedDate, selectedBranch]);

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
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 p-4 border rounded-md bg-card">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-md shrink-0">
          <Button 
            variant={viewMode === 'flat' ? 'default' : 'ghost'} 
            onClick={() => setViewMode('flat')}
            className={`text-xs h-8 px-4 ${viewMode === 'flat' ? 'shadow-sm' : ''}`}
          >
            Flat View
          </Button>
          <Button 
            variant={viewMode === 'grouped' ? 'default' : 'ghost'} 
            onClick={() => setViewMode('grouped')}
            className={`text-xs h-8 px-4 ${viewMode === 'grouped' ? 'shadow-sm' : ''}`}
          >
            Grouped View
          </Button>
        </div>
        
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center xl:justify-end gap-3 max-w-3xl">
          <Input
            type="search"
            placeholder="Search by employee, branch, or shift..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[260px] text-xs"
          />
          <Select value={branchId} onValueChange={(val) => handleBranchChange(val || 'all')}>
            <SelectTrigger className="w-full sm:w-[150px] text-xs h-8 bg-transparent">
              <span className="flex-1 text-left truncate">
                {branchId === 'all' ? 'All Branches' : branches.find((b: any) => b.id === branchId)?.name || 'All Branches'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs" label="All Branches">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs" label={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(val) => handleStatusChange(val || 'all')}>
            <SelectTrigger className="w-full sm:w-[150px] text-xs h-8 bg-transparent">
              <span className="flex-1 text-left truncate">
                {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs" label="All Statuses">All Statuses</SelectItem>
              <SelectItem value="pending" className="text-xs" label="Pending">Pending</SelectItem>
              <SelectItem value="assigned" className="text-xs" label="Assigned">Assigned</SelectItem>
              <SelectItem value="completed" className="text-xs" label="Completed">Completed</SelectItem>
              <SelectItem value="replaced" className="text-xs" label="Replaced">Replaced</SelectItem>
              <SelectItem value="removed" className="text-xs" label="Removed">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {viewMode === 'flat' && (
          <div className="border rounded-md bg-card overflow-x-auto shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="h-10 text-xs font-semibold">Date</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">Branch</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">Employee</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">Shift Details</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">Pay Amount</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">Status</TableHead>
                  <TableHead className="h-10 text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8 text-muted-foreground text-sm">
                      No assignments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  initialData.map((assignment) => (
                    <TableRow key={assignment.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs font-medium whitespace-nowrap">
                        {assignment.shift_schedules?.shift_date ? format(new Date(assignment.shift_schedules.shift_date), 'dd MMM yyyy') : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {assignment.shift_schedules?.branches?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        <div className="flex flex-col">
                          <span>{assignment.employees?.users?.full_name}</span>
                          <span className="text-[10px] text-muted-foreground">{assignment.employees?.employee_code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {assignment.shift_schedules?.shift_type}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-600">
                        ₹{Number(assignment.payment_snapshot || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          assignment.assignment_status === 'assigned' ? 'default' :
                          assignment.assignment_status === 'completed' ? 'secondary' :
                          assignment.assignment_status === 'replaced' || assignment.assignment_status === 'removed' ? 'destructive' :
                          assignment.assignment_status === 'pending' ? 'outline' : 'outline'
                        } className={`text-[10px] capitalize ${assignment.assignment_status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200' : ''}`}>
                          {assignment.assignment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
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
                        {isAdmin && assignment.assignment_status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700"
                              onClick={async () => await approveAssignment(assignment.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                              onClick={async () => await rejectAssignment(assignment.id)}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {viewMode === 'grouped' && (
          Object.keys(groupedData).length === 0 ? (
            <div className="text-center p-8 border rounded-md bg-card text-muted-foreground text-sm">
              No assignments found.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Level 1: Dates Tab List */}
              <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
                {Object.keys(groupedData).map((date) => {
                  const isActive = selectedDate === date;
                  const totalCount = Object.values(groupedData[date]).reduce((acc, curr) => acc + curr.length, 0);
                  return (
                    <button
                      key={date}
                      onClick={() => { setSelectedDate(date); setSelectedBranch(Object.keys(groupedData[date])[0]); }}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-[#0f172a] text-white shadow-md ring-1 ring-[#0f172a]' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{date === 'Unknown Date' ? 'Unknown Date' : format(new Date(date), 'EEE, d MMM yyyy')}</span>
                      <Badge variant={isActive ? 'secondary' : 'outline'} className={`text-[10px] ${isActive ? 'bg-white/20 text-white hover:bg-white/20 border-none' : 'text-slate-500'}`}>
                        {totalCount}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col md:flex-row gap-5 items-start">
                {/* Level 2: Branches Cards */}
                {selectedDate && groupedData[selectedDate] && (
                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-56 overflow-x-auto md:overflow-visible shrink-0 pb-2 md:pb-0 hide-scrollbar md:border-r md:pr-5 border-slate-200">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 hidden md:block px-1">Branches</h3>
                    {Object.keys(groupedData[selectedDate]).map((branch) => {
                      const isActive = selectedBranch === branch;
                      const count = groupedData[selectedDate][branch].length;
                      return (
                        <button
                          key={branch}
                          onClick={() => setSelectedBranch(branch)}
                          className={`flex-shrink-0 flex items-center justify-between text-left px-3.5 py-3 rounded-lg text-sm transition-all border ${
                            isActive 
                              ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm ring-1 ring-blue-100' 
                              : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className={`font-semibold truncate ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>{branch}</span>
                          <Badge variant="secondary" className={`ml-3 text-[10px] shrink-0 ${isActive ? 'bg-blue-200/50 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                            {count}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Level 3: Roster */}
                <div className="flex-1 w-full min-w-0 bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col">
                  {selectedDate && selectedBranch && groupedData[selectedDate][selectedBranch] ? (
                    <>
                      <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <h3 className="font-bold text-slate-800 text-base">{selectedBranch} Roster</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedDate === 'Unknown Date' ? 'Unknown Date' : format(new Date(selectedDate), 'EEEE, d MMMM yyyy')}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-white">{groupedData[selectedDate][selectedBranch].length} Assignments</Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/80">
                            <TableRow>
                              <TableHead className="h-10 text-xs font-semibold">Employee</TableHead>
                              <TableHead className="h-10 text-xs font-semibold">Shift Details</TableHead>
                              <TableHead className="h-10 text-xs font-semibold">Pay Amount</TableHead>
                              <TableHead className="h-10 text-xs font-semibold">Status</TableHead>
                              <TableHead className="h-10 text-xs font-semibold text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupedData[selectedDate][selectedBranch].map((assignment) => (
                              <TableRow key={assignment.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-xs">
                                  <div className="flex flex-col">
                                    <span>{assignment.employees?.users?.full_name}</span>
                                    <span className="text-[10px] text-muted-foreground">{assignment.employees?.employee_code}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {assignment.shift_schedules?.shift_type}
                                </TableCell>
                                <TableCell className="text-xs font-semibold text-emerald-600">
                                  ₹{Number(assignment.payment_snapshot || 0).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    assignment.assignment_status === 'assigned' ? 'default' :
                                    assignment.assignment_status === 'completed' ? 'secondary' :
                                    assignment.assignment_status === 'replaced' || assignment.assignment_status === 'removed' ? 'destructive' :
                                    assignment.assignment_status === 'pending' ? 'outline' : 'outline'
                                  } className={`text-[10px] capitalize ${assignment.assignment_status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200' : ''}`}>
                                    {assignment.assignment_status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
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
                                  {isAdmin && assignment.assignment_status === 'pending' && (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700"
                                        onClick={async () => await approveAssignment(assignment.id)}
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Approve
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 text-xs bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                                        onClick={async () => await rejectAssignment(assignment.id)}
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                      <p>Select a date and branch to view roster</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
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
