import { getEmployeePayments, getAdminPaymentRequests } from '@/app/actions/payments';
import { getAllBranches } from '@/app/actions/branches';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PaymentsClient } from './payments-client';
import { EmployeePaymentsClient } from './employee-payments-client';

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

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = parseInt(params.pageSize || '15', 10);
  const search = params.search || '';
  const dateFrom = params.dateFrom || '';
  const dateTo = params.dateTo || '';
  const branchId = params.branch || 'all';
  const status = params.status || 'all';

  if (session.role === 'employee') {
    const [{ data, total, summary }, branches] = await Promise.all([
      getEmployeePayments({
        page,
        pageSize,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: status || undefined,
      }),
      getAllBranches(),
    ]);

    return (
      <div className="space-y-6">
        <EmployeePaymentsClient
          initialData={data}
          totalCount={total}
          currentPage={page}
          pageSize={pageSize}
          summary={summary}
          branches={branches}
          filters={{ dateFrom, dateTo, status }}
        />
      </div>
    );
  }

  // Admin / Super Admin view
  const [paymentResult, branches] = await Promise.all([
    getAdminPaymentRequests({
      page,
      pageSize,
      search,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      branchId: branchId || undefined,
      status: status || undefined,
    }),
    getAllBranches(),
  ]);

  return (
    <div className="space-y-6">
      <PaymentsClient
        initialData={paymentResult.data}
        totalCount={paymentResult.total}
        currentPage={page}
        pageSize={pageSize}
        summary={paymentResult.summary}
        branches={branches}
        filters={{ search, dateFrom, dateTo, branch: branchId, status }}
      />
    </div>
  );
}
