import { getBranchDateSettlements } from '@/app/actions/payments';
import { getAllBranches } from '@/app/actions/branches';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PaymentsClient } from './payments-client';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    branch?: string;
    status?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Employees should use their Settings "My Payments" tab
  if (session.role === 'employee') {
    redirect('/dashboard/settings?tab=payments');
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const pageSize = parseInt(resolvedParams.pageSize || '15', 10);
  const search = resolvedParams.search || '';
  const dateFrom = resolvedParams.dateFrom || '';
  const dateTo = resolvedParams.dateTo || '';
  const branchId = resolvedParams.branch || 'all';
  const status = resolvedParams.status || 'all';

  const { data: settlements, total, summary } = await getBranchDateSettlements({
    page,
    pageSize,
    search,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    branchId: branchId || undefined,
    status: status || undefined,
  });

  const branches = await getAllBranches();

  return (
    <div className="space-y-6">
      <PaymentsClient
        initialData={settlements}
        totalCount={total}
        currentPage={page}
        pageSize={pageSize}
        summary={summary}
        branches={branches}
      />
    </div>
  );
}
