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
import { Plus, X } from 'lucide-react';
import { createBranch } from '@/app/actions/branches';

export function CreateBranchModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedShifts, setSelectedShifts] = useState<string[]>(['MORNING', 'AFTERNOON', 'FULL_DAY']);
  const [customShift, setCustomShift] = useState('');

  const toggleShift = (shift: string) => {
    if (['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(shift)) return;
    setSelectedShifts(prev => 
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );
  };

  const addCustomShift = () => {
    const shift = customShift.trim().toUpperCase().replace(/\s+/g, '_');
    if (shift && !selectedShifts.includes(shift)) {
      setSelectedShifts(prev => [...prev, shift]);
    }
    setCustomShift('');
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
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedShifts.map(shift => {
                  const isDefault = ['MORNING', 'AFTERNOON', 'FULL_DAY'].includes(shift);
                  return (
                  <div key={shift} className={`flex items-center space-x-1.5 px-2 py-1 rounded-md border ${isDefault ? 'bg-blue-50 border-blue-100' : 'bg-slate-100 border-slate-200'}`}>
                    <span className={`text-xs font-medium ${isDefault ? 'text-blue-700' : 'text-slate-700'}`}>
                      {shift.replace(/_/g, ' ')}
                    </span>
                    {!isDefault && (
                      <button 
                        type="button" 
                        onClick={() => toggleShift(shift)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )})}
              </div>
              
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="e.g., NIGHT SHIFT"
                  value={customShift}
                  onChange={(e) => setCustomShift(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomShift();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button type="button" size="sm" variant="secondary" onClick={addCustomShift} className="h-8 shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
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
