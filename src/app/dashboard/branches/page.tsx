import { getBranches } from '@/app/actions/branches';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BranchesClient } from './branches-client';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function BranchesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const pageSize = parseInt(resolvedParams.pageSize || '15', 10);
  const search = resolvedParams.search || '';

  const { data: branches, total } = await getBranches({
    page,
    pageSize,
    search,
  });

  const isAdmin = session.role !== 'employee';

  return (
    <div className="space-y-6">

      <BranchesClient
        initialData={branches}
        totalCount={total}
        currentPage={page}
        pageSize={pageSize}
        isAdmin={isAdmin}
      />
    </div>
  );
}
