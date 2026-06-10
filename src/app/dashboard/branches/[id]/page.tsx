import { getBranchById } from '@/app/actions/branches';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditBranchModal } from '../edit-branch-modal';
import { ArchiveBranchAction } from '../archive-branch-action';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';

export default async function BranchViewPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role === 'employee') redirect('/dashboard');

  const branch = await getBranchById(params.id);
  if (!branch) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-semibold">Branch Not Found</h2>
        <Link href="/dashboard/branches"><Button variant="outline">Back to Branches</Button></Link>
      </div>
    );
  }

  const activeEvents = branch.events?.filter((e: any) => e.is_active).length || 0;

  // Extract unique active employees from events assignments
  const activeEmployeesMap = new Map();
  branch.events?.forEach((event: any) => {
    event.assignments?.forEach((assignment: any) => {
      const emp = assignment.employees;
      if (emp && emp.id) {
        activeEmployeesMap.set(emp.id, emp);
      }
    });
  });
  const activeEmployees = Array.from(activeEmployeesMap.values()).filter(
    (emp: any) => emp.status === 'active'
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/branches">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{branch.name}</h2>
          <p className="text-muted-foreground">
            {branch.description || 'No description provided.'}
          </p>
        </div>
        {session.role === 'super_admin' && (
          <div className="flex space-x-2">
            <EditBranchModal branch={branch} />
            <ArchiveBranchAction branchId={branch.id} />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
          <Badge variant={branch.is_active ? 'default' : 'secondary'}>
            {branch.is_active ? 'Active' : 'Archived'}
          </Badge>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Active Events</h3>
          <div className="text-2xl font-bold">{activeEvents}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Linked Employees</h3>
          <div className="text-2xl font-bold">{activeEmployees}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Events</h3>
        </div>
        <div className="divide-y">
          {branch.events?.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No events found for this branch.</div>
          ) : (
            branch.events?.map((ev: any) => (
              <div key={ev.id} className="p-4 px-6 flex justify-between items-center">
                <div>
                  <div className="font-medium">{format(new Date(ev.event_date), 'MMMM d, yyyy')}</div>
                  <div className="text-sm text-muted-foreground">Required Staff: {ev.required_staff_count}</div>
                </div>
                <Badge variant={ev.is_active ? 'default' : 'secondary'}>{ev.is_active ? 'Active' : 'Archived'}</Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
