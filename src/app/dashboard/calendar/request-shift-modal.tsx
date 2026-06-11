'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { requestSelfShift } from '@/app/actions/shift-schedules';
import { Loader2, CalendarPlus } from 'lucide-react';

interface RequestShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: any[];
}

export function RequestShiftModal({ isOpen, onClose, branches }: RequestShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [date, setDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [shiftType, setShiftType] = useState('');

  const SHIFT_TYPES = [
    { id: 'MORNING', name: 'Morning' },
    { id: 'AFTERNOON', name: 'Afternoon' },
    { id: 'FULL_DAY', name: 'Full Day' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !branchId || !shiftType) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await requestSelfShift(branchId, date, shiftType);
      
      setLoading(false);
      
      if (res?.error) {
        setError(res.error);
      } else {
        onClose();
        // Reset form
        setDate('');
        setBranchId('');
        setShiftType('');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-emerald-500" />
              Request Shift
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="date">Shift Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Select value={branchId} onValueChange={(val) => setBranchId(val || '')} required>
                <SelectTrigger id="branch">
                  <span className="flex-1 text-left truncate">
                    {branchId ? branches.find((b: any) => b.id === branchId)?.name : 'Select branch'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shiftType">Shift Type</Label>
              <Select value={shiftType} onValueChange={(val) => setShiftType(val || '')} required>
                <SelectTrigger id="shiftType">
                  <span className="flex-1 text-left truncate">
                    {shiftType ? SHIFT_TYPES.find((st: any) => st.id === shiftType)?.name : 'Select shift type'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map(st => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              Your request will be sent to an Admin for approval.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                'Request Shift'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
