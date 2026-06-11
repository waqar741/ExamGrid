'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { createBulkSpreadsheetShifts } from '@/app/actions/shift-schedules';

interface WizardClientProps {
  branches: any[];
  employees: any[];
}

const SHIFT_TYPES = [
  { id: 'MORNING', name: 'Morning' },
  { id: 'AFTERNOON', name: 'Afternoon' },
  { id: 'FULL_DAY', name: 'Full Day' }
];

export function WizardClient({ branches, employees }: WizardClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 state
  const [date, setDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [shiftType, setShiftType] = useState('');

  // Step 2 state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const filteredEmployees = employees.filter((e) => {
    const term = searchQuery.toLowerCase();
    const name = e.users?.full_name?.toLowerCase() || '';
    const code = e.employee_code?.toLowerCase() || '';
    return name.includes(term) || code.includes(term);
  });

  const handleNext = () => {
    if (step === 1) {
      if (!date || !branchId || !shiftType) {
        setError('Please fill in all shift details.');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      if (selectedEmployees.length === 0) {
        setError('Please select at least one employee.');
        return;
      }
      setError('');
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const toggleEmployee = (id: string) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(eId => eId !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const toggleAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      // Deselect all
      setSelectedEmployees([]);
    } else {
      // Select all visible
      const allIds = new Set([...selectedEmployees, ...filteredEmployees.map(e => e.id)]);
      setSelectedEmployees(Array.from(allIds));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // Transform into the format expected by createBulkSpreadsheetShifts
    const payload = selectedEmployees.map(empId => ({
      employeeId: empId,
      branchId,
      date,
      shiftType,
      notes: 'Assigned via Guided Wizard'
    }));

    try {
      const res = await createBulkSpreadsheetShifts(payload);
      if (res.error) {
        setError(res.error);
      } else {
        router.push('/dashboard/shift-schedule');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const branchName = branches.find(b => b.id === branchId)?.name || '';
  const shiftTypeName = SHIFT_TYPES.find(s => s.id === shiftType)?.name || '';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">


      {/* Stepper */}
      <div className="relative mb-12 flex justify-between">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-200 -z-10 -translate-y-1/2"></div>
        
        {/* Step 1 */}
        <div className="flex flex-col items-center gap-2 bg-slate-50/0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors bg-white ${
            step >= 1 ? 'border-[#0f172a] bg-[#0f172a] text-white' : 'border-slate-300 text-slate-400'
          }`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span className={`text-[13px] font-semibold bg-white px-2 ${step >= 1 ? 'text-[#0f172a]' : 'text-slate-400'}`}>
            Shift Details
          </span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center gap-2 bg-slate-50/0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors bg-white ${
            step >= 2 ? 'border-[#0f172a] bg-[#0f172a] text-white' : 'border-slate-200 text-slate-400'
          }`}>
            {step > 2 ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <span className={`text-[13px] font-semibold bg-white px-2 ${step >= 2 ? 'text-[#0f172a]' : 'text-slate-400'}`}>
            Select Employees
          </span>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center gap-2 bg-slate-50/0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors bg-white ${
            step >= 3 ? 'border-[#0f172a] bg-[#0f172a] text-white' : 'border-slate-200 text-slate-400'
          }`}>
            3
          </div>
          <span className={`text-[13px] font-semibold bg-white px-2 ${step >= 3 ? 'text-[#0f172a]' : 'text-slate-400'}`}>
            Preview & Save
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Card Content */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Step 1: Shift Details</h2>
              <p className="text-sm text-slate-500 mt-1">Define the shift that will be assigned.</p>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Step 2: Select Employees</h2>
              <p className="text-sm text-slate-500 mt-1">Choose the employees who will work this shift.</p>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Step 3: Preview & Save</h2>
              <p className="text-sm text-slate-500 mt-1">Review the assignments before creating them.</p>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 min-h-[300px]">
          {/* Step 1 Form */}
          {step === 1 && (
            <div className="max-w-md space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-slate-600 font-medium">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  className="h-11" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch" className="text-slate-600 font-medium">Branch</Label>
                <select
                  id="branch"
                  className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="" disabled>Select Branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shiftType" className="text-slate-600 font-medium">Shift Type</Label>
                <select
                  id="shiftType"
                  className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                >
                  <option value="" disabled>Select Shift Type...</option>
                  {SHIFT_TYPES.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2 Form */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search employees..." 
                    className="pl-9 h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="text-sm font-medium text-slate-600">
                  {selectedEmployees.length} selected
                </div>
              </div>

              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                <div className="p-3 bg-slate-50 flex items-center gap-3 hover:bg-slate-100 transition-colors cursor-pointer" onClick={toggleAll}>
                  <Checkbox 
                    checked={filteredEmployees.length > 0 && selectedEmployees.length === filteredEmployees.length}
                    className="pointer-events-none"
                  />
                  <span className="text-sm font-semibold text-slate-700">Select All Visible</span>
                </div>
                {filteredEmployees.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No employees found.</div>
                ) : (
                  filteredEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                      <Checkbox 
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{emp.users?.full_name}</p>
                        <p className="text-xs text-slate-500">{emp.employee_code}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3 Form */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-50 border rounded-lg p-6 space-y-4">
                <h3 className="text-base font-semibold text-slate-900 border-b pb-2">Shift Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Date</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">{date ? new Date(date).toLocaleDateString() : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Branch</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">{branchName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Shift Type</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">{shiftTypeName}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Assigning {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}
                  </h3>
                </div>
                <div className="max-h-[250px] overflow-y-auto p-4 flex flex-wrap gap-2">
                  {selectedEmployees.map(empId => {
                    const emp = employees.find(e => e.id === empId);
                    return (
                      <div key={empId} className="bg-white border rounded-full px-3 py-1 text-xs font-medium shadow-sm">
                        {emp?.users?.full_name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={step === 1 || loading}
            className="text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < 3 ? (
            <Button 
              onClick={handleNext}
              className="bg-[#0f172a] hover:bg-[#1e293b] px-6"
            >
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-[#0f172a] hover:bg-[#1e293b] px-6"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Create Assignments
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
