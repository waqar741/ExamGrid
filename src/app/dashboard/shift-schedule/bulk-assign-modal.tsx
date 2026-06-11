'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { bulkAssignEmployees, getSmartAvailability } from '@/app/actions/assignments';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftScheduleId: string | null;
}

export function BulkAssignModal({ isOpen, onClose, shiftScheduleId }: BulkAssignModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [availability, setAvailability] = useState<{
    available: any[];
    alreadyAssigned: any[];
    conflict: any[];
    unavailable: any[];
  } | null>(null);

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && shiftScheduleId) {
      loadAvailability();
    } else {
      setAvailability(null);
      setSelectedEmployees([]);
      setError('');
    }
  }, [isOpen, shiftScheduleId]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const data = await getSmartAvailability(shiftScheduleId!);
      setAvailability(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (id: string) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(eId => eId !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await bulkAssignEmployees(shiftScheduleId!, selectedEmployees);
      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!availability && loading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Staff</DialogTitle>
          <DialogDescription>Select available employees to assign to this shift.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="py-4 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Available Employees</h4>
          {availability?.available.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No available employees found.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
              {availability?.available.map(emp => (
                <div key={emp.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md">
                  <Checkbox 
                    id={`emp-${emp.id}`} 
                    checked={selectedEmployees.includes(emp.id)}
                    onCheckedChange={() => toggleEmployee(emp.id)}
                  />
                  <Label htmlFor={`emp-${emp.id}`} className="flex-1 cursor-pointer">{emp.name}</Label>
                </div>
              ))}
            </div>
          )}

          {availability?.alreadyAssigned.length! > 0 && (
            <div className="text-sm text-muted-foreground">
              {availability?.alreadyAssigned.length} employee(s) already assigned to this shift.
            </div>
          )}
          {availability?.conflict.length! > 0 && (
            <div className="text-sm text-amber-600">
              {availability?.conflict.length} employee(s) have a scheduling conflict.
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between w-full">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedEmployees.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {selectedEmployees.length} Staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
