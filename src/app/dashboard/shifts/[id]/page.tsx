import { getShiftById } from '@/app/actions/shifts';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditShiftModal } from '../edit-shift-modal';
import { ArchiveShiftAction } from '../archive-shift-action';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';

export default async function ShiftViewPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role === 'employee') redirect('/dashboard');

  const shift = await getShiftById(params.id);
  if (!shift) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-semibold">Shift Not Found</h2>
        <Link href="/dashboard/shifts"><Button variant="outline">Back to Shifts</Button></Link>
      </div>
    );
  }

  const assignments = shift.assignments || [];
  const rates = shift.branch_pay_rates || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/shifts">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{shift.name}</h2>
          <p className="text-muted-foreground">
            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
          </p>
        </div>
        {(session.role === 'super_admin' || session.role === 'admin') && (
          <div className="flex space-x-2">
            <EditShiftModal shift={shift} />
            {session.role === 'super_admin' && <ArchiveShiftAction shiftId={shift.id} />}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
          <Badge variant={shift.is_active ? 'default' : 'secondary'}>
            {shift.is_active ? 'Active' : 'Archived'}
          </Badge>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Assignments</h3>
          <div className="text-2xl font-bold">{assignments.length}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Active Pay Rates</h3>
          <Link href={`/dashboard/pay-rates?shift=${shift.id}`}>
            <Button variant="outline" size="sm">Manage Rates</Button>
          </Link>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {rates.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No pay rates configured for this shift.</div>
          ) : (
            rates.map((r: any, idx: number) => (
              <div key={idx} className="p-4 px-6 flex justify-between items-center">
                <div className="font-medium">{r.branches?.name}</div>
                <div className="font-bold text-green-600">₹{r.rate}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
