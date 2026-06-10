'use client';

import { Button } from '@/components/ui/button';
import { archiveBranch } from '@/app/actions/branches';
import { useRouter } from 'next/navigation';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

export function ArchiveBranchAction({ branchId }: { branchId: string }) {
  const router = useRouter();

  const handleConfirm = async () => {
    const res = await archiveBranch(branchId);
    if (!res?.error) {
      router.push('/dashboard/branches');
    }
    return res;
  };

  return (
    <ConfirmationModal
      trigger={<Button variant="destructive" size="sm">Archive</Button>}
      title="Archive Branch"
      description="Are you sure you want to continue?"
      level={1}
      confirmLabel="Confirm"
      confirmVariant="destructive"
      onConfirm={handleConfirm}
    />
  );
}
