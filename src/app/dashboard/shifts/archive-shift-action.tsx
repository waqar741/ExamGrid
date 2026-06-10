'use client';

import { Button } from '@/components/ui/button';
import { archiveShift } from '@/app/actions/shifts';
import { useRouter } from 'next/navigation';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

export function ArchiveShiftAction({ shiftId }: { shiftId: string }) {
  const router = useRouter();

  const handleConfirm = async () => {
    const res = await archiveShift(shiftId);
    if (!res?.error) {
      router.push('/dashboard/shifts');
    }
    return res;
  };

  return (
    <ConfirmationModal
      trigger={<Button variant="destructive" size="sm">Archive</Button>}
      title="Archive Shift Template"
      description="Are you sure you want to continue?"
      level={1}
      confirmLabel="Confirm"
      confirmVariant="destructive"
      onConfirm={handleConfirm}
    />
  );
}
