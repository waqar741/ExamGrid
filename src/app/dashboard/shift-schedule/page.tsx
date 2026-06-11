import { getShiftSchedules } from '@/app/actions/shift-schedules';
import { getBranches } from '@/app/actions/branches';
import { getShifts } from '@/app/actions/shifts';
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
  const shiftTemplateId = searchParams.shift || 'all';
  const startDate = searchParams.startDate || '';
  const endDate = searchParams.endDate || '';

  const [shiftsRes, branches, shiftTemplates] = await Promise.all([
    getShiftSchedules({ page, pageSize: 10, search, branchId, shiftTemplateId, startDate, endDate }),
    getBranches(),
    getShifts()
  ]);

  return (
    <ShiftScheduleClient
      initialData={shiftsRes.data}
      total={shiftsRes.total}
      currentPage={page}
      searchQuery={search}
      branches={branches}
      shiftTemplates={shiftTemplates}
      currentBranch={branchId}
      currentShift={shiftTemplateId}
      currentStartDate={startDate}
      currentEndDate={endDate}
    />
  );
}
