import { getShiftScheduleById } from '@/app/actions/shift-schedules';
import { getSmartAvailability, removeAssignment, replaceAssignment } from '@/app/actions/assignments';
import { notFound } from 'next/navigation';
import { ShiftLedgerClient } from './shift-ledger-client';
import { getSession } from '@/lib/auth';
import { getEmployees } from '@/app/actions/employees'; // if needed, but smart availability handles employees

export const dynamic = 'force-dynamic';

export default async function ShiftLedgerPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return null;

  const [shift, smartAvailability] = await Promise.all([
    getShiftScheduleById(params.id),
    getSmartAvailability(params.id)
  ]);

  if (!shift) {
    notFound();
  }

  return (
    <ShiftLedgerClient 
      shift={shift} 
      availability={smartAvailability} 
      isAdmin={session.role !== 'employee'} 
    />
  );
}
