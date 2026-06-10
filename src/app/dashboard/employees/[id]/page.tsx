import { getEmployeeById } from '@/app/actions/employees';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditEmployeeModal } from '../edit-employee-modal';
import { ArchiveEmployeeAction } from '../archive-employee-action';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';

export default async function EmployeeViewPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role === 'employee' && params.id !== session.userId)) redirect('/dashboard');

  const employee = await getEmployeeById(params.id);
  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-semibold">Employee Not Found</h2>
        <Link href="/dashboard/employees"><Button variant="outline">Back to Employees</Button></Link>
      </div>
    );
  }

  const assignments = employee.assignments || [];
  const totalAssignments = assignments.length;
  const pendingPayments = assignments.filter((a: any) => a.payments?.[0]?.payment_status === 'pending').reduce((acc: number, curr: any) => acc + (curr.payments[0].amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={session.role === 'employee' ? '/dashboard' : '/dashboard/employees'}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{employee.users?.full_name}</h2>
          <p className="text-muted-foreground">
            {employee.users?.email} | {employee.phone || 'No phone'}
          </p>
        </div>
        {(session.role === 'super_admin' || session.role === 'admin') && (
          <div className="flex space-x-2">
            <EditEmployeeModal employee={employee} />
            <ArchiveEmployeeAction employeeId={employee.id} />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
          <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
            {employee.status.toUpperCase()}
          </Badge>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Assignments</h3>
          <div className="text-2xl font-bold">{totalAssignments}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Pending Payment</h3>
          <div className="text-2xl font-bold text-destructive">₹{pendingPayments}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Assignment History</h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {assignments.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No assignments found for this employee.</div>
          ) : (
            assignments.map((a: any) => (
              <div key={a.id} className="p-4 px-6 flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {a.events?.branches?.name} - {a.shift_templates?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {a.events?.event_date ? format(new Date(a.events.event_date), 'MMMM d, yyyy') : 'Unknown Date'}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Badge variant="outline">{a.assignment_status}</Badge>
                  {a.attendance?.[0] && <Badge variant={a.attendance[0].attendance_status === 'present' ? 'default' : 'destructive'}>{a.attendance[0].attendance_status}</Badge>}
                  {a.payments?.[0] && <Badge variant={a.payments[0].payment_status === 'paid' ? 'default' : 'outline'}>₹{a.payments[0].amount} {a.payments[0].payment_status}</Badge>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
