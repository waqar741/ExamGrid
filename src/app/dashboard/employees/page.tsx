import { getEmployees } from '@/app/actions/employees';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmployeesClient } from './employees-client';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const pageSize = parseInt(resolvedParams.pageSize || '10', 10);
  const search = resolvedParams.search || '';

  const { data: employees, total } = await getEmployees({
    page,
    pageSize,
    search,
  });

  const isAdmin = session.role !== 'employee';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
        <p className="text-muted-foreground">
          Manage and monitor invigilator records
        </p>
      </div>

      <EmployeesClient
        initialData={employees}
        totalCount={total}
        currentPage={page}
        pageSize={pageSize}
        isAdmin={isAdmin}
      />
    </div>
  );
}
