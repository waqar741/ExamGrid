import { getEvents } from '@/app/actions/events';
import { getAllBranches } from '@/app/actions/branches';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EventsClient } from './events-client';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    branchId?: string;
  }>;
}

export default async function EventsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const pageSize = parseInt(resolvedParams.pageSize || '10', 10);
  const search = resolvedParams.search || '';
  const branchId = resolvedParams.branchId || 'all';

  const { data: events, total } = await getEvents({
    page,
    pageSize,
    search,
    branchId,
  });

  const branches = await getAllBranches();
  const isAdmin = session.role !== 'employee';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Events</h2>
        <p className="text-muted-foreground">
          Manage examination schedules
        </p>
      </div>

      <EventsClient
        initialData={events}
        totalCount={total}
        currentPage={page}
        pageSize={pageSize}
        isAdmin={isAdmin}
        branches={branches}
      />
    </div>
  );
}
