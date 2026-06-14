'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { replaceAssignment } from '@/app/actions/assignments';

interface ReplaceAssignmentModalProps {
  assignmentId: string;
  currentEmployeeName: string;
  allEmployees: any[];
}

export function ReplaceAssignmentModal({ assignmentId, currentEmployeeName, allEmployees }: ReplaceAssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [reason, setReason] = useState('');

  const handleReplace = async () => {
    if (!newEmployeeId || !reason) {
      setError('Please select a replacement and provide a reason.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await replaceAssignment(assignmentId, newEmployeeId, reason);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      setNewEmployeeId('');
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm">Replace</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Replace Employee</DialogTitle>
          <DialogDescription>
            Reassign this shift to a different employee.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-sm text-destructive font-medium">{error}</div>
          )}
          
          <div className="grid gap-2">
            <Label>Current Employee</Label>
            <div className="text-sm font-medium p-2 bg-muted rounded-md">{currentEmployeeName}</div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new_employee_id">Replacement Employee</Label>
            <Select value={newEmployeeId} onValueChange={(val) => setNewEmployeeId(val || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {allEmployees.map((emp) => {
                  const fullName = Array.isArray(emp.users) ? emp.users[0]?.full_name : emp.users?.full_name;
                  const displayLabel = `${fullName || 'Unknown'} (${emp.employee_code})`;
                  return (
                    <SelectItem key={emp.id} value={emp.id} label={displayLabel}>
                      {displayLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Replacement</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Sick leave, No show"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleReplace} disabled={loading}>
            {loading ? 'Replacing...' : 'Confirm Replacement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
