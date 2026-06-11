import { getReportMetrics } from '@/app/actions/reports';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReportsClient } from './reports-client';
import { getAllBranches } from '@/app/actions/branches';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession();
  if (session?.role === 'employee') redirect('/dashboard');

  const resolvedParams = await searchParams;
  let startDate = resolvedParams.startDate as string;
  let endDate = resolvedParams.endDate as string;

  if (!startDate || !endDate) {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    startDate = startDate || oneMonthAgo.toISOString().split('T')[0];
    endDate = endDate || today.toISOString().split('T')[0];
  }

  const branchId = resolvedParams.branchId as string;

  const branches = await getAllBranches();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      </div>

      <ReportsClient 
        branches={branches} 
        currentStartDate={startDate} 
        currentEndDate={endDate} 
        currentBranchId={branchId} 
      />
    </div>
  );
}
