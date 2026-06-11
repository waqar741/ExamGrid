'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { createBulkShifts } from '@/app/actions/shift-schedules';
import { Loader2 } from 'lucide-react';

interface BulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: any[];
}

const SHIFT_TYPES = [
  { id: 'MORNING', name: 'Morning' },
  { id: 'AFTERNOON', name: 'Afternoon' },
  { id: 'FULL_DAY', name: 'Full Day' }
];

export function BulkCreateModal({ isOpen, onClose, branches }: BulkCreateModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState('');
  
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  
  // Format: `${branchId}_${shiftTemplateId}` -> required count
  const [requirements, setRequirements] = useState<Record<string, number>>({});

  const handleNext = () => {
    if (step === 1 && dates.length === 0) {
      setError('Please add at least one date');
      return;
    }
    if (step === 2 && selectedBranches.length === 0) {
      setError('Please select at least one branch');
      return;
    }
    if (step === 3 && selectedShifts.length === 0) {
      setError('Please select at least one shift type');
      return;
    }
    
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const addDate = () => {
    if (dateInput && !dates.includes(dateInput)) {
      setDates([...dates, dateInput].sort());
      setDateInput('');
    }
  };

  const removeDate = (d: string) => {
    setDates(dates.filter(date => date !== d));
  };

  const toggleBranch = (id: string) => {
    if (selectedBranches.includes(id)) {
      setSelectedBranches(selectedBranches.filter(bId => bId !== id));
    } else {
      setSelectedBranches([...selectedBranches, id]);
    }
  };

  const toggleShift = (id: string) => {
    if (selectedShifts.includes(id)) {
      setSelectedShifts(selectedShifts.filter(sId => sId !== id));
    } else {
      setSelectedShifts([...selectedShifts, id]);
    }
  };

  const updateRequirement = (branchId: string, shiftId: string, value: string) => {
    const val = parseInt(value, 10) || 0;
    setRequirements(prev => ({
      ...prev,
      [`${branchId}_${shiftId}`]: val
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await createBulkShifts({
        dates,
        branchIds: selectedBranches,
        shiftTypes: selectedShifts,
        requiredStaffPerShift: requirements
      });

      if (res.error) {
        setError(res.error);
      } else {
        // Reset and close
        setStep(1);
        setDates([]);
        setSelectedBranches([]);
        setSelectedShifts([]);
        setRequirements({});
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Create Shifts</DialogTitle>
          <DialogDescription>
            Step {step} of 4: {
              step === 1 ? 'Select Dates' : 
              step === 2 ? 'Select Branches' : 
              step === 3 ? 'Select Shift Types' : 
              'Set Required Staff'
            }
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  type="date" 
                  value={dateInput} 
                  onChange={e => setDateInput(e.target.value)} 
                />
                <Button type="button" onClick={addDate} variant="secondary">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {dates.map(d => (
                  <div key={d} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm">
                    <span>{new Date(d).toLocaleDateString()}</span>
                    <button onClick={() => removeDate(d)} className="text-muted-foreground hover:text-destructive">&times;</button>
                  </div>
                ))}
                {dates.length === 0 && <span className="text-sm text-muted-foreground">No dates selected.</span>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {branches.map(b => (
                <div key={b.id} className="flex items-center space-x-2 border p-3 rounded-md">
                  <Checkbox 
                    id={`branch-${b.id}`} 
                    checked={selectedBranches.includes(b.id)}
                    onCheckedChange={() => toggleBranch(b.id)}
                  />
                  <Label htmlFor={`branch-${b.id}`} className="flex-1 cursor-pointer">{b.name}</Label>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHIFT_TYPES.map(s => (
                <div key={s.id} className="flex items-center space-x-2 border p-3 rounded-md">
                  <Checkbox 
                    id={`shift-${s.id}`} 
                    checked={selectedShifts.includes(s.id)}
                    onCheckedChange={() => toggleShift(s.id)}
                  />
                  <Label htmlFor={`shift-${s.id}`} className="flex-1 cursor-pointer">
                    <span className="block font-medium">{s.name}</span>
                  </Label>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Set the required staff count for each branch and shift combination. These counts will apply to all {dates.length} selected dates.
              </p>
              
              <div className="space-y-4">
                {selectedBranches.map(branchId => {
                  const branch = branches.find(b => b.id === branchId);
                  return (
                    <div key={branchId} className="border rounded-md p-4 space-y-3">
                      <h4 className="font-semibold text-sm">{branch?.name}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedShifts.map(shiftId => {
                          const shift = SHIFT_TYPES.find(s => s.id === shiftId);
                          const reqKey = `${branchId}_${shiftId}`;
                          return (
                            <div key={shiftId} className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded">
                              <Label className="text-xs">{shift?.name}</Label>
                              <Input 
                                type="number" 
                                min="0" 
                                className="w-20 h-8" 
                                value={requirements[reqKey] || ''}
                                onChange={e => updateRequirement(branchId, shiftId, e.target.value)}
                                placeholder="0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between w-full">
          <Button variant="outline" onClick={step === 1 ? onClose : handleBack} disabled={loading}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {step < 4 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create {dates.length * selectedBranches.length * selectedShifts.length} Shifts
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
