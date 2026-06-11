import { getShiftSchedules } from '@/app/actions/shift-schedules';
import { getBranches } from '@/app/actions/branches';
import { ShiftScheduleClient } from './shift-schedule-client';

export const dynamic = 'force-dynamic';

export default async function ShiftSchedulePage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; branch?: string; shift?: string; startDate?: string; endDate?: string }
}) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const search = searchParams.search || '';
  const branchId = searchParams.branch || 'all';
  const shiftType = searchParams.shift || 'all';
  const startDate = searchParams.startDate || '';
  const endDate = searchParams.endDate || '';

  const [shiftsRes, branches] = await Promise.all([
    getShiftSchedules({ page, pageSize: 10, search, branchId, shiftType, startDate, endDate }),
    getBranches()
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
