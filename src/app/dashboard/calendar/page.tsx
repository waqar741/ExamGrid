import { getCalendarEvents } from '@/app/actions/calendar';
import { getAllBranches } from '@/app/actions/branches';
import { CalendarClient } from './calendar-client';
import { getSession } from '@/lib/auth';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getSession();

  // Parse searchParams for month and year, default to current
  const now = new Date();
  const year = parseInt(searchParams.year as string) || now.getFullYear();
  const month = parseInt(searchParams.month as string) || (now.getMonth() + 1);
  const branchId = searchParams.branch as string | undefined;

  const events = await getCalendarEvents(year, month, branchId);
  const branches = await getAllBranches();

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
        <p className="text-muted-foreground">
          View and manage examination events by month.
        </p>
      </div>

      <div className="flex-1 bg-card border rounded-lg overflow-x-auto flex flex-col">
        <CalendarClient 
          initialEvents={events} 
          branches={branches} 
          currentYear={year} 
          currentMonth={month} 
          selectedBranch={branchId || 'all'} 
          role={session?.role || 'employee'}
        />
      </div>
    </div>
  );
}
