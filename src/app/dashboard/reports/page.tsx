import { getReportMetrics } from '@/app/actions/reports';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReportsClient } from './reports-client';
import { getAllBranches } from '@/app/actions/branches';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getSession();
  if (session?.role === 'employee') redirect('/dashboard');

  const startDate = searchParams.startDate as string;
  const endDate = searchParams.endDate as string;
  const branchId = searchParams.branch as string;

  const metrics = await getReportMetrics(startDate, endDate, branchId);
  if (!metrics) return null;

  const branches = await getAllBranches();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            View system metrics and export data
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium tracking-tight mb-2">Total Paid Amount</h3>
          <div className="text-2xl font-bold text-green-600">₹{metrics.totalPaid}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium tracking-tight mb-2">Total Pending Amount</h3>
          <div className="text-2xl font-bold text-destructive">₹{metrics.totalPending}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium tracking-tight mb-2">Attendance Rate</h3>
          <div className="text-2xl font-bold">{metrics.attendanceRate}%</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow">
          <h3 className="text-sm font-medium tracking-tight mb-2">Active Employees</h3>
          <div className="text-2xl font-bold">{metrics.employeesCount}</div>
        </div>
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
