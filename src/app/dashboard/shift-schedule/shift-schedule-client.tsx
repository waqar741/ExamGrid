'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Calendar as CalendarIcon, Building2, Clock, Eye, Trash2, MoreHorizontal, Users, UserPlus, UserMinus, CheckSquare, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { archiveShiftSchedule } from '@/app/actions/shift-schedules';
import { BulkCreateModal } from './bulk-create-modal';
import { BulkAssignModal } from './bulk-assign-modal';
import { ShiftDrawer } from './shift-drawer';

export function ShiftScheduleClient({ 
  initialData, 
  total, 
  currentPage, 
  searchQuery, 
  branches,
  currentBranch,
  currentShift,
  currentStartDate,
  currentEndDate
}: any) {
  const SHIFT_TYPES = [
    { id: 'MORNING', name: 'Morning' },
    { id: 'AFTERNOON', name: 'Afternoon' },
    { id: 'FULL_DAY', name: 'Full Day' }
  ];
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const openDrawer = (id: string) => {
    setSelectedShiftId(id);
    setIsDrawerOpen(true);
  };

  const openAssignModal = (id: string) => {
    setSelectedShiftId(id);
    setIsAssignModalOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search, page: 1 });
  };

  const updateFilters = (newFilters: any) => {
    const params = new URLSearchParams(window.location.search);
    if (newFilters.search !== undefined) params.set('search', newFilters.search);
    if (newFilters.page !== undefined) params.set('page', newFilters.page.toString());
    if (newFilters.branch !== undefined) params.set('branch', newFilters.branch);
    if (newFilters.shift !== undefined) params.set('shift', newFilters.shift);
    if (newFilters.startDate !== undefined) params.set('startDate', newFilters.startDate);
    if (newFilters.endDate !== undefined) params.set('endDate', newFilters.endDate);
    
    router.push(`/dashboard/shift-schedule?${params.toString()}`);
  };

  const handleArchive = async (id: string) => {
    if (confirm('Are you sure you want to archive this shift schedule?')) {
      await archiveShiftSchedule(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex w-full sm:w-auto gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/shift-schedule/wizard')} className="flex-1 sm:flex-none gap-2 bg-white">
            <Plus className="h-4 w-4" />
            Guided Setup
          </Button>
          <Button onClick={() => router.push('/dashboard/shift-schedule/bulk-entry')} className="flex-1 sm:flex-none gap-2 bg-[#0f172a] hover:bg-[#1e293b]">
            <Plus className="h-4 w-4" />
            Spreadsheet Entry
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search shifts..."
              className="pl-9 w-full bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <select 
            className="flex h-9 w-full sm:w-40 items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={currentBranch}
            onChange={(e) => updateFilters({ branch: e.target.value, page: 1 })}
          >
            <option value="all">All Branches</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select 
            className="flex h-9 w-full sm:w-40 items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={currentShift}
            onChange={(e) => updateFilters({ shift: e.target.value, page: 1 })}
          >
            <option value="all">All Shifts</option>
            {SHIFT_TYPES.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          
          <Input 
            type="date" 
            className="h-9 w-full sm:w-36 bg-white text-xs" 
            value={currentStartDate}
            onChange={(e) => updateFilters({ startDate: e.target.value, page: 1 })}
          />
          <Input 
            type="date" 
            className="h-9 w-full sm:w-36 bg-white text-xs" 
            value={currentEndDate}
            onChange={(e) => updateFilters({ endDate: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-slate-50/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Branch</th>
                <th className="px-6 py-3 font-medium">Shift Type</th>
                <th className="px-6 py-3 font-medium text-center">Req. Staff</th>
                <th className="px-6 py-3 font-medium text-center">Assigned Staff</th>
                <th className="px-6 py-3 font-medium text-center">Remaining Needed</th>
                <th className="px-6 py-3 font-medium text-center">Attendance</th>
                <th className="px-6 py-3 font-medium text-center">Payments</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No shift schedules found matching your criteria.
                  </td>
                </tr>
              ) : (
                initialData.map((shift: any) => {
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {new Date(shift.shift_date).toLocaleDateString('en-GB', { 
                              day: 'numeric', month: 'short', year: 'numeric' 
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{shift.branches?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className="bg-slate-50">
                            {shift.shift_type || 'N/A'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium">{shift.required_staff_count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-blue-600">
                          {shift.assignments?.filter((a: any) => a.assignment_status === 'assigned' || a.assignment_status === 'completed').length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`text-sm font-bold ${
                          (shift.required_staff_count - (shift.assignments?.filter((a: any) => a.assignment_status === 'assigned' || a.assignment_status === 'completed').length || 0)) > 0 
                            ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {Math.max(0, shift.required_staff_count - (shift.assignments?.filter((a: any) => a.assignment_status === 'assigned' || a.assignment_status === 'completed').length || 0))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge variant="outline">
                          {shift.assignments?.filter((a: any) => a.attendance?.some((at: any) => at.attendance_status === 'present' || at.attendance_status === 'late')).length || 0} / {shift.assignments?.filter((a: any) => a.assignment_status === 'assigned' || a.assignment_status === 'completed').length || 0}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge variant="outline" className="bg-slate-50">
                          {shift.assignments?.filter((a: any) => a.payments?.some((p: any) => p.payment_status === 'paid')).length || 0} Paid
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDrawer(shift.id)}>
                              <Users className="mr-2 h-4 w-4" />
                              <span>View Staff</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssignModal(shift.id)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              <span>Assign Staff</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/shift-schedule/${shift.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Ledger (Full Detail)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(shift.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Archive Shift</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {total > 10 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50">
            <span className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{((currentPage - 1) * 10) + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * 10, total)}</span> of <span className="font-medium text-foreground">{total}</span>
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => updateFilters({ page: currentPage - 1 })}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage * 10 >= total}
                onClick={() => updateFilters({ page: currentPage + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <BulkCreateModal 
        isOpen={isBulkCreateOpen} 
        onClose={() => setIsBulkCreateOpen(false)} 
        branches={branches}
      />

      <BulkAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        shiftScheduleId={selectedShiftId}
      />

      <ShiftDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        shiftScheduleId={selectedShiftId}
      />
    </div>
  );
}
