'use client';

import { Button } from '@/components/ui/button';
import { archiveEvent } from '@/app/actions/events';
import { useRouter } from 'next/navigation';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

export function ArchiveEventAction({ eventId }: { eventId: string }) {
  const router = useRouter();

  const handleConfirm = async () => {
    const res = await archiveEvent(eventId);
    if (!res?.error) {
      router.push('/dashboard/events');
    }
    return res;
  };

  return (
    <ConfirmationModal
      trigger={<Button variant="destructive" size="sm">Archive</Button>}
      title="Archive Event"
      description="Are you sure you want to continue?"
      level={1}
      confirmLabel="Confirm"
      confirmVariant="destructive"
      onConfirm={handleConfirm}
    />
  );
}
