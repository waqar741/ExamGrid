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
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const getEventStatusColor = (ev: any) => {
    const assigned = ev.assignments?.filter((a: any) => a.assignment_status !== 'replaced' && a.assignment_status !== 'removed') || [];
    const assignedCount = assigned.length;
    
    if (role === 'employee') {
      const myAssignment = assigned[0];
      if (!myAssignment) return 'bg-muted';
      const attStatus = myAssignment.attendance?.[0]?.attendance_status;
      if (attStatus === 'present' || attStatus === 'late') return 'bg-green-500';
      if (attStatus === 'absent') return 'bg-red-500';
      const payStatus = myAssignment.payments?.[0]?.payment_status;
      if (payStatus === 'pending') return 'bg-blue-500';
      return 'bg-yellow-500';
    }

    // Check for pending payments
    let hasPendingPayment = false;
    assigned.forEach((a: any) => {
      if (a.payments?.[0]?.payment_status === 'pending') hasPendingPayment = true;
    });

    if (hasPendingPayment) return 'bg-blue-500';
    if (assignedCount === 0 && ev.required_staff_count > 0) return 'bg-red-500';
    if (assignedCount > 0 && assignedCount < ev.required_staff_count) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <>
      {/* Header / Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b gap-4">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
              const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
              updateFilters(prevYear, prevMonth, selectedBranch);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold w-40 text-center">
            {months[currentMonth - 1]} {currentYear}
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
              const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
              updateFilters(nextYear, nextMonth, selectedBranch);
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
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y border-b overflow-y-auto flex-1 min-w-[700px] lg:min-w-0">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="bg-muted/10"></div>;

          // Find events for this day
          // Note: event_date from DB is YYYY-MM-DD
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = initialEvents.filter(ev => ev.event_date === dateStr);

          return (
            <div 
              key={day} 
              className="p-2 flex flex-col hover:bg-muted/5 transition-colors cursor-pointer"
              onClick={() => setSelectedDate(new Date(currentYear, currentMonth - 1, day))}
            >
              <div className="text-right text-sm font-medium text-muted-foreground mb-1">{day}</div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {dayEvents.map(ev => {
                  const assignedCount = ev.assignments?.filter((a: any) => a.assignment_status !== 'replaced' && a.assignment_status !== 'removed').length || 0;
                  const dotColor = getEventStatusColor(ev);
                  
                  return (
                    <div 
                      key={ev.id} 
                      className="text-xs bg-muted border rounded px-1.5 py-1 flex items-center justify-between"
                    >
                      <span className="truncate mr-1 font-medium">{ev.branches?.name}</span>
                      <div className="flex items-center flex-shrink-0 space-x-1.5">
                        {role !== 'employee' && (
                          <span className="text-[10px] text-muted-foreground">{assignedCount}/{ev.required_staff_count}</span>
                        )}
                        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <EventDayModal 
        date={selectedDate} 
        events={selectedDate ? initialEvents.filter(ev => {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          return ev.event_date === dateStr;
        }) : []}
        onClose={() => setSelectedDate(null)} 
        role={role}
      />
    </>
  );
}
