'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { EditBranchModal } from '../edit-branch-modal';
import { useRouter } from 'next/navigation';

export function EditBranchAction({ branch }: { branch: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Edit className="h-4 w-4 mr-2" />
        Edit Branch
      </Button>
      
      <EditBranchModal 
        branch={branch} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onUpdate={() => router.refresh()}
      />
    </>
  );
}
