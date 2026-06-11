'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventDayModal } from './event-day-modal';
import { RequestShiftModal } from './request-shift-modal';
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';

interface CalendarClientProps {
  initialEvents: any[];
  branches: any[];
  currentYear: number;
  currentMonth: number;
  selectedBranch: string;
  role: string;
}

export function CalendarClient({
  initialEvents,
  branches,
  currentYear,
  currentMonth,
  selectedBranch,
  role,
}: CalendarClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const updateFilters = (year: number, month: number, branch: string) => {
    router.push(`/dashboard/calendar?year=${year}&month=${month}&branch=${branch}`);
  };

  // Calendar Grid Logic
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sunday

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();
  const mobileGrid = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    mobileGrid.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    mobileGrid.push({ day: i, isCurrentMonth: true });
  }
  let nextDay = 1;
  while (mobileGrid.length < 42) {
    mobileGrid.push({ day: nextDay++, isCurrentMonth: false });
  }

  const getEventStatusColor = (ev: any) => {
    const allAssigned = ev.assignments || [];
    const validAssigned = allAssigned.filter((a: any) => a.assignment_status !== 'replaced' && a.assignment_status !== 'removed');
    const assignedCount = validAssigned.length;
    
    if (role === 'employee') {
      const myAssignment = allAssigned[0];
      if (!myAssignment) return 'bg-muted';
      
      if (myAssignment.assignment_status === 'pending') return 'bg-orange-500';
      if (myAssignment.assignment_status === 'removed') return 'bg-red-600'; // Rejected
      if (myAssignment.assignment_status === 'assigned') return 'bg-emerald-500'; // Approved
      
      const attStatus = myAssignment.attendance?.[0]?.attendance_status;
      if (attStatus === 'present' || attStatus === 'late') return 'bg-green-500';
      if (attStatus === 'absent') return 'bg-red-500';
      const payStatus = myAssignment.payments?.[0]?.payment_status;
      if (payStatus === 'pending') return 'bg-blue-500';
      return 'bg-emerald-500';
    }

    // Check for pending payments
    let hasPendingPayment = false;
    validAssigned.forEach((a: any) => {
      if (a.payments?.[0]?.payment_status === 'pending') hasPendingPayment = true;
    });

    if (hasPendingPayment) return 'bg-blue-500';
    if (assignedCount === 0 && ev.required_staff_count > 0) return 'bg-red-500';
    if (assignedCount > 0 && assignedCount < ev.required_staff_count) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <>
      {/* Light Mobile Calendar */}
      <div className="md:hidden bg-slate-50 min-h-[calc(100vh-4rem)] p-4 pt-8 font-sans text-slate-900">
        <div className="flex items-center justify-between mb-8 px-2">
          <button 
            onClick={() => {
              const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
              const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
              updateFilters(prevYear, prevMonth, selectedBranch || 'all');
            }}
            className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 tracking-wide">
            {months[currentMonth - 1]} {currentYear}
          </h2>
          <button 
            onClick={() => {
              const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
              const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
              updateFilters(nextYear, nextMonth, selectedBranch || 'all');
            }}
            className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Branch filter and actions for mobile */}
        <div className="mb-6 flex gap-2">
          <Select 
            value={selectedBranch} 
            onValueChange={(val) => updateFilters(currentYear, currentMonth, val || 'all')}
          >
            <SelectTrigger className="flex-1 bg-white border-slate-200 text-slate-900 focus:ring-1 focus:ring-slate-500 rounded-xl h-12 shadow-sm">
              <span className="flex-1 text-left truncate">
                {selectedBranch === 'all' ? 'All Branches' : branches.find((b: any) => b.id === selectedBranch)?.name || 'All Branches'}
              </span>
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl">
              <SelectItem value="all" className="focus:bg-slate-50 focus:text-slate-900 border-b border-slate-100">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id} className="focus:bg-slate-50 focus:text-slate-900">{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {role === 'employee' && (
            <Button 
              onClick={() => setIsRequestModalOpen(true)}
              className="h-12 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm flex-shrink-0"
            >
              <CalendarPlus className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-2">
          {mobileGrid.map((item, idx) => {
            const today = new Date();
            const isToday = item.isCurrentMonth && 
                            today.getDate() === item.day && 
                            today.getMonth() + 1 === currentMonth && 
                            today.getFullYear() === currentYear;
            
            // Find events for this day to show dots
            let dayEvents: any[] = [];
            if (item.isCurrentMonth) {
              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
              dayEvents = initialEvents.filter(ev => ev.shift_date === dateStr);
            }
            
            return (
              <div 
                key={idx} 
                onClick={() => {
                   if (item.isCurrentMonth) setSelectedDate(new Date(currentYear, currentMonth - 1, item.day));
                }}
                className={`
                  aspect-[4/5] flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all
                  ${item.isCurrentMonth ? 'bg-white text-slate-900 hover:bg-slate-50 cursor-pointer shadow-sm border border-slate-200' : 'bg-transparent text-slate-400'}
                  ${isToday ? 'border-[2px] border-emerald-500 shadow-emerald-100' : ''}
                `}
              >
                <span>{item.day}</span>
                {item.isCurrentMonth && dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map(ev => (
                      <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${getEventStatusColor(ev)}`}></span>
                    ))}
                    {dayEvents.length > 3 && <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hidden md:flex flex-col flex-1 h-full bg-white rounded-xl border shadow-sm overflow-hidden min-h-[calc(100vh-8rem)]">
      {/* Header / Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b gap-4">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
              const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
              updateFilters(prevYear, prevMonth, selectedBranch || 'all');
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select 
            value={currentMonth.toString()} 
            onValueChange={(val) => updateFilters(currentYear, parseInt(val || '0'), selectedBranch || 'all')}
          >
            <SelectTrigger className="w-[120px] font-semibold">
              <span className="flex-1 text-left truncate">
                {months[currentMonth - 1] || currentMonth}
              </span>
            </SelectTrigger>
            <SelectContent>
              {months.map((m, idx) => (
                <SelectItem key={m} value={(idx + 1).toString()} label={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={currentYear.toString()} 
            onValueChange={(val) => updateFilters(parseInt(val || '0'), currentMonth, selectedBranch || 'all')}
          >
            <SelectTrigger className="w-[90px] font-semibold">
              <span className="flex-1 text-left truncate">
                {currentYear}
              </span>
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                <SelectItem key={y} value={y.toString()} label={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
              const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
              updateFilters(nextYear, nextMonth, selectedBranch || 'all');
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Select 
            value={selectedBranch} 
            onValueChange={(val) => updateFilters(currentYear, currentMonth, val || 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <span className="flex-1 text-left truncate">
                {selectedBranch === 'all' ? 'All Branches' : branches.find((b: any) => b.id === selectedBranch)?.name || 'All Branches'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {role === 'employee' && (
            <Button 
              onClick={() => setIsRequestModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Request Shift
            </Button>
          )}
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b bg-muted/30 min-w-[700px] lg:min-w-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-[1fr] divide-x divide-y border-b overflow-hidden flex-1 min-w-[700px] lg:min-w-0">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="bg-muted/10"></div>;

          // Find events for this day
          // Note: shift_date from DB is YYYY-MM-DD
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = initialEvents.filter(ev => ev.shift_date === dateStr);

          return (
            <div 
              key={day} 
              className="p-2 flex flex-col hover:bg-muted/5 transition-colors cursor-pointer"
              onClick={() => setSelectedDate(new Date(currentYear, currentMonth - 1, day))}
            >
              <div className="text-right text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">{day}</div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {dayEvents.map(ev => {
                  const assignedCount = ev.assignments?.filter((a: any) => a.assignment_status !== 'replaced' && a.assignment_status !== 'removed').length || 0;
                  const dotColor = getEventStatusColor(ev);
                  
                  return (
                      <div 
                        key={ev.id} 
                        className="text-[10px] sm:text-xs bg-muted border rounded px-1 py-0.5 sm:px-1.5 sm:py-1 flex items-center justify-between"
                      >
                        <span className="truncate mr-1 font-medium">{ev.branches?.name} - {ev.shift_templates?.name}</span>
                        <div className="flex items-center flex-shrink-0 space-x-1 sm:space-x-1.5">
                          {role !== 'employee' && (
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground">{assignedCount}/{ev.required_staff_count}</span>
                          )}
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dotColor}`}></span>
                        </div>
                      </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <EventDayModal 
        date={selectedDate} 
        events={selectedDate ? initialEvents.filter(ev => {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          return ev.shift_date === dateStr;
        }) : []}
        onClose={() => setSelectedDate(null)} 
        role={role}
      />

      <RequestShiftModal 
        isOpen={isRequestModalOpen} 
        onClose={() => setIsRequestModalOpen(false)} 
        branches={branches} 
      />
    </>
  );
}
