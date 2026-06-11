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
  const page = 1;
  const pageSize = 15;
  const search = resolvedParams.search || '';

  const { data: employees, total } = await getEmployees({
    page,
    pageSize,
    search,
  });

  const isAdmin = session.role !== 'employee';

  return (
    <div className="space-y-6">

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
