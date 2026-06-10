'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAvailableEmployees, createAssignment } from '@/app/actions/assignments';
import { format } from 'date-fns';

interface WizardProps {
  events: any[];
  shifts: any[];
}

export function AssignmentWizard({ events, shifts }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedEvent = events.find(e => e.id === eventId);
  const selectedShift = shifts.find(s => s.id === shiftId);

  useEffect(() => {
    if (step === 3 && eventId && shiftId) {
      setLoading(true);
      getAvailableEmployees(eventId, shiftId).then(data => {
        setAvailableEmployees(data);
        setLoading(false);
      });
    }
  }, [step, eventId, shiftId]);

  const toggleEmployee = (id: string) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedEmployees(newSet);
  };

  const handleNext = () => {
    if (step === 1 && !eventId) return setError('Please select an event');
    if (step === 2 && !shiftId) return setError('Please select a shift');
    if (step === 3 && selectedEmployees.size === 0) return setError('Please select at least one employee');
    
    setError('');
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    const res = await createAssignment(eventId, shiftId, Array.from(selectedEmployees));
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push('/dashboard/assignments');
    }
  };

  return (
    <div className="space-y-8">
      {/* Stepper Header */}
      <div className="flex justify-between items-center text-sm font-medium text-muted-foreground mb-8">
        {[1, 2, 3, 4].map(num => (
          <div key={num} className={`flex items-center ${step >= num ? 'text-primary' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= num ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'}`}>
              {num}
            </div>
            {num < 4 && <div className={`w-12 h-1 mx-2 rounded ${step > num ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {/* Step 1: Event */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 1: Select Event</h3>
          <div className="grid gap-2">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={(val) => setEventId(val || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {format(new Date(event.event_date), 'MMM d, yyyy')} - {event.branches?.name} (Needs: {event.required_staff_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 2: Shift */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 2: Select Shift</h3>
          <div className="grid gap-2">
            <Label>Shift</Label>
            <Select value={shiftId} onValueChange={(val) => setShiftId(val || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name} ({shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 3: Employees */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 3: Select Employees</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading available employees...</p>
          ) : availableEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available employees for this date and shift.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableEmployees.map(emp => {
                const isSelected = selectedEmployees.has(emp.id);
                return (
                  <div 
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={`cursor-pointer border rounded-md p-4 transition-all ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground'}`}
                  >
                    <div className="font-medium">{emp.users?.full_name}</div>
                    <div className="text-xs text-muted-foreground">Available</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 4: Review Assignment</h3>
          <div className="p-4 bg-muted/50 rounded-md space-y-2">
            <p><strong>Event Date:</strong> {selectedEvent ? format(new Date(selectedEvent.event_date), 'MMM d, yyyy') : ''}</p>
            <p><strong>Branch:</strong> {selectedEvent?.branches?.name}</p>
            <p><strong>Shift:</strong> {selectedShift?.name}</p>
            <p><strong>Staff Count:</strong> {selectedEmployees.size} selected</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t mt-8">
        <Button variant="outline" onClick={step === 1 ? () => router.back() : handleBack}>
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        {step < 4 ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Confirm Assignment'}
          </Button>
        )}
      </div>
    </div>
  );
}
