import { getAssignmentsForAttendance } from '@/app/actions/attendance';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AttendanceClient } from './attendance-client';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const pageSize = parseInt(resolvedParams.pageSize || '10', 10);
  const search = resolvedParams.search || '';

  const { data: assignments, total } = await getAssignmentsForAttendance({
    page,
    pageSize,
    search,
  });

  const isAdmin = session.role !== 'employee';

  return (
    <div className="space-y-6">

      <AttendanceClient
        initialData={assignments}
        totalCount={total}
        currentPage={page}
        pageSize={pageSize}
        isAdmin={isAdmin}
      />
    </div>
  );
}
