import { getEvents } from '@/app/actions/events';
import { getShifts } from '@/app/actions/shifts';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AssignmentWizard } from './wizard';

export default async function CreateAssignmentPage() {
  const session = await getSession();
  if (session?.role === 'employee') {
    redirect('/dashboard');
  }

  const { data: events } = await getEvents({ page: 1, pageSize: 1000 });
  const shifts = await getShifts();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Assignment</h2>
        <p className="text-muted-foreground">
          Follow the steps to assign staff to an event shift.
        </p>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <AssignmentWizard events={events} shifts={shifts} />
      </div>
    </div>
  );
}
