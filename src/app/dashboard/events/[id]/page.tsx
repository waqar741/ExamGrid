import { getEventById } from '@/app/actions/events';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditEventModal } from '../edit-event-modal';
import { ArchiveEventAction } from '../archive-event-action';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';

export default async function EventViewPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role === 'employee') redirect('/dashboard');

  const ev = await getEventById(params.id);
  if (!ev) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-semibold">Event Not Found</h2>
        <Link href="/dashboard/events"><Button variant="outline">Back to Events</Button></Link>
      </div>
    );
  }

  const assignments = ev.assignments || [];
  const assignedStaff = assignments.filter((a: any) => a.assignment_status !== 'replaced' && a.assignment_status !== 'removed').length;
  const isShortage = assignedStaff < ev.required_staff_count;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/events">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{ev.branches?.name} Examination</h2>
          <p className="text-muted-foreground">
            {format(new Date(ev.event_date), 'MMMM d, yyyy')}
          </p>
        </div>
        {(session.role === 'super_admin' || session.role === 'admin') && (
          <div className="flex space-x-2">
            <EditEventModal eventData={ev} />
            {session.role === 'super_admin' && <ArchiveEventAction eventId={ev.id} />}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
          <Badge variant={ev.is_active ? 'default' : 'secondary'}>
            {ev.is_active ? 'Active' : 'Archived'}
          </Badge>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Required Staff</h3>
          <div className="text-2xl font-bold">{ev.required_staff_count}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Assigned Staff</h3>
          <div className={`text-2xl font-bold ${isShortage ? 'text-destructive' : 'text-green-600'}`}>
            {assignedStaff}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
          <div className="text-sm truncate">{ev.notes || 'None'}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Assigned Staff</h3>
          <Link href={`/dashboard/assignments?event=${ev.id}`}>
            <Button variant="outline" size="sm">Manage Assignments</Button>
          </Link>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {assignments.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No staff assigned to this event yet.</div>
          ) : (
            assignments.map((a: any) => (
              <div key={a.id} className="p-4 px-6 flex justify-between items-center">
                <div>
                  <div className="font-medium">{a.employees?.users?.full_name}</div>
                  <div className="text-sm text-muted-foreground">{a.shift_templates?.name}</div>
                </div>
                <Badge variant={a.assignment_status === 'assigned' ? 'default' : 'secondary'}>
                  {a.assignment_status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
