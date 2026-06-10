import { getAssignments } from '@/app/actions/assignments';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AssignmentsClient } from './assignments-client';
import { getAllBranches } from '@/app/actions/branches';
import { getAllEmployees } from '@/app/actions/employees';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    branchId?: string;
    status?: string;
  }>;
}

export default async function AssignmentsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const pageSize = parseInt(resolvedParams.pageSize || '10', 10);
  const search = resolvedParams.search || '';
  const branchId = resolvedParams.branchId || 'all';
  const status = resolvedParams.status || 'all';

  const { data: assignments, total } = await getAssignments({
    page,
    pageSize,
    search,
    branchId,
    status,
  });

  const branches = await getAllBranches();
  const allEmployees = session.role !== 'employee' ? await getAllEmployees() : [];
  const isAdmin = session.role !== 'employee';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Assignments</h2>
        <p className="text-muted-foreground">
          Manage invigilator shift assignments
        </p>
      </div>

      <AssignmentsClient
        initialData={assignments}
        totalCount={total}
        currentPage={page}
        pageSize={pageSize}
        isAdmin={isAdmin}
        branches={branches}
        allEmployees={allEmployees}
      />
    </div>
  );
}
