import { getShiftSchedules } from '@/app/actions/shift-schedules';
import { getAllBranches } from '@/app/actions/branches';
import { ShiftScheduleClient } from './shift-schedule-client';

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ShiftSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; branch?: string; shift?: string; startDate?: string; endDate?: string }>
}) {
  const session = await getSession();
  if (!session || session.role === 'employee') redirect('/dashboard');
  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page) : 1;
  const search = resolvedParams.search || '';
  const branchId = resolvedParams.branch || 'all';
  const shiftType = resolvedParams.shift || 'all';
  const startDate = resolvedParams.startDate || '';
  const endDate = resolvedParams.endDate || '';

  const [shiftsRes, branches] = await Promise.all([
    getShiftSchedules({ page, pageSize: 10, search, branchId, shiftType, startDate, endDate }),
    getAllBranches()
  ]);

  return (
    <ShiftScheduleClient
      initialData={shiftsRes.data}
      total={shiftsRes.total}
      currentPage={page}
      searchQuery={search}
      branches={branches}
      currentBranch={branchId}
      currentShift={shiftType}
      currentStartDate={startDate}
      currentEndDate={endDate}
    />
  );
}
