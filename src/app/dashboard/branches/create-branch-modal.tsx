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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createBranch } from '@/app/actions/branches';

export function CreateBranchModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedShifts, setSelectedShifts] = useState<string[]>(['MORNING', 'AFTERNOON', 'FULL_DAY']);

  const toggleShift = (shift: string) => {
    setSelectedShifts(prev => 
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.append('available_shift_types', JSON.stringify(selectedShifts));
    const res = await createBranch(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Branch</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Branch</DialogTitle>
            <DialogDescription>
              Add a new examination center here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-destructive font-medium">{error}</div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Branch Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Nerul"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Optional notes about the branch"
              />
            </div>
            <div className="grid gap-2">
              <Label>Available Shifts</Label>
              <div className="flex flex-col gap-2 mt-1">
                {['MORNING', 'AFTERNOON', 'FULL_DAY'].map(shift => (
                  <div key={shift} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`shift-${shift}`} 
                      checked={selectedShifts.includes(shift)}
                      onCheckedChange={() => toggleShift(shift)}
                    />
                    <Label htmlFor={`shift-${shift}`} className="text-sm font-normal cursor-pointer">
                      {shift.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
