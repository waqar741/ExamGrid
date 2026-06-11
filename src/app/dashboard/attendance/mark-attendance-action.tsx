'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { markAttendance } from '@/app/actions/attendance';
import { MoreHorizontal } from 'lucide-react';

interface MarkAttendanceActionProps {
  assignmentId: string;
  currentStatus: string;
}

export function MarkAttendanceAction({ assignmentId, currentStatus }: MarkAttendanceActionProps) {
  const [loading, setLoading] = useState(false);

  const handleMark = async (status: string) => {
    setLoading(true);
    await markAttendance(assignmentId, status);
    setLoading(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleMark('present')} disabled={currentStatus === 'present'}>
          Mark Present
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMark('late')} disabled={currentStatus === 'late'}>
          Mark Late
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMark('absent')} disabled={currentStatus === 'absent'} className="text-destructive focus:text-destructive">
          Mark Absent
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMark('skipped')} disabled={currentStatus === 'skipped'} className="text-slate-500 focus:text-slate-600">
          Skip & Complete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
