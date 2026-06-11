'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Save, DownloadCloud, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createBulkSpreadsheetShifts } from '@/app/actions/shift-schedules';
import { Loader2 } from 'lucide-react';

interface BulkEntryClientProps {
  branches: any[];
  employees: any[];
}

const SHIFT_TYPES = [
  { id: 'MORNING', name: 'Morning' },
  { id: 'AFTERNOON', name: 'Afternoon' },
  { id: 'FULL_DAY', name: 'Full Day' }
];

export function BulkEntryClient({ branches, employees }: BulkEntryClientProps) {
  const router = useRouter();
  const [rows, setRows] = useState([
    { id: 1, employeeId: '', branchId: '', date: '', shiftType: '', notes: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now(), employeeId: '', branchId: '', date: '', shiftType: '', notes: '' }
    ]);
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const validateRows = () => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.employeeId || !r.branchId || !r.date || !r.shiftType) {
        return `Row ${i + 1} is incomplete. Please fill all required fields (Employee, Branch, Date, Shift).`;
      }
    }
    
    // Check duplicates
    const seen = new Set();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // A conflict is same employee, same date
      // Strictly speaking, same employee same date different branch is a conflict. 
      // Different shift type? Depends if full day. Let's just check employee+date for simplicity of validation here.
      const key = `${r.employeeId}_${r.date}`;
      if (seen.has(key)) {
        const empName = employees.find(e => e.id === r.employeeId)?.users?.full_name || 'Employee';
        return `Duplicate assignment detected for ${empName} on ${r.date}.`;
      }
      seen.add(key);
    }
    
    return null;
  };

  const handleSave = async () => {
    setError('');
    const validationError = validateRows();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const payload = rows.map(r => ({
      employeeId: r.employeeId,
      branchId: r.branchId,
      date: r.date,
      shiftType: r.shiftType,
      notes: r.notes
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto flex gap-2 bg-white">
            <DownloadCloud className="h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto flex gap-2 bg-[#0f172a] hover:bg-[#1e293b]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm font-medium">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-slate-50/50 border-b">
              <tr>
                <th className="px-4 py-4 font-semibold w-12 text-center">#</th>
                <th className="px-4 py-4 font-semibold w-64">Employee</th>
                <th className="px-4 py-4 font-semibold w-64">Branch</th>
                <th className="px-4 py-4 font-semibold w-48">Date</th>
                <th className="px-4 py-4 font-semibold w-48">Shift Type</th>
                <th className="px-4 py-4 font-semibold text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3 text-center text-muted-foreground font-medium">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={row.employeeId}
                      onChange={(e) => updateRow(row.id, 'employeeId', e.target.value)}
                    >
                      <option value="" disabled>Select Employee...</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.users?.full_name} ({e.employee_code})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={row.branchId}
                      onChange={(e) => updateRow(row.id, 'branchId', e.target.value)}
                    >
                      <option value="" disabled>Select Branch...</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="date"
                      className="h-9"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={row.shiftType}
                      onChange={(e) => updateRow(row.id, 'shiftType', e.target.value)}
                    >
                      <option value="" disabled>Select Shift Type...</option>
                      {SHIFT_TYPES.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 border-t flex justify-center">
             <Button variant="ghost" onClick={addRow} className="text-muted-foreground hover:text-foreground">
               <Plus className="mr-2 h-4 w-4" />
               Add Row
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
