'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toggleAdminStatus } from '@/app/actions/admin-users';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

export function ToggleAdminAction({ userId, currentStatus }: { userId: string, currentStatus: boolean }) {
  const actionText = currentStatus ? 'disable' : 'restore';

  return (
    <ConfirmationModal
      level={3}
      title={currentStatus ? "Disable Administrator" : "Restore Administrator"}
      description={`Are you sure you want to ${actionText} this administrator account? This will toggle their system access. Please type CONFIRM to proceed.`}
      confirmLabel={currentStatus ? "Disable" : "Restore"}
      confirmVariant={currentStatus ? "destructive" : "default"}
      trigger={
        <Button 
          variant={currentStatus ? "destructive" : "default"} 
          size="sm"
        >
          {currentStatus ? 'Disable' : 'Restore'}
        </Button>
      }
      onConfirm={async () => {
        return await toggleAdminStatus(userId, currentStatus);
      }}
    />
  );
}

