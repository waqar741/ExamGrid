'use client';

import { Button } from '@/components/ui/button';
import { archiveEmployee } from '@/app/actions/employees';
import { useRouter } from 'next/navigation';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

export function ArchiveEmployeeAction({ employeeId }: { employeeId: string }) {
  const router = useRouter();

  const handleConfirm = async () => {
    const res = await archiveEmployee(employeeId);
    if (!res?.error) {
      router.push('/dashboard/employees');
    }
    return res;
  };

  return (
    <ConfirmationModal
      trigger={<Button variant="destructive" size="sm">Archive</Button>}
      title="Archive Employee"
      description="Are you sure you want to continue?"
      level={1}
      confirmLabel="Confirm"
      confirmVariant="destructive"
      onConfirm={handleConfirm}
    />
  );
}
