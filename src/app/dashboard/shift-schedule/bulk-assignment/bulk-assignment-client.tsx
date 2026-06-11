'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { createShiftSchedule, getShiftSchedules } from '@/app/actions/shift-schedules';
import { bulkAssignEmployees } from '@/app/actions/assignments';

const SHIFT_TYPES = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'FULL_DAY', label: 'Full Day' },
];

type Branch = { id: string; name: string };
type Employee = { id: string; user_id?: string; users?: { full_name?: string; email?: string } };

interface Row {
  id: string;
  branchId: string;
  date: string;
  shiftType: string;
  employeeId: string;
  notes?: string;
}

export function BulkAssignmentClient({ branches, employees }: { branches: Branch[]; employees: Employee[] }) {
  const [rows, setRows] = useState<Row[]>([{
    id: String(Date.now()),
    branchId: branches?.[0]?.id || '',
    date: '',
    shiftType: 'MORNING',
    employeeId: employees?.[0]?.id || '',
    notes: ''
  }]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addRow = () => {
    setRows(prev => [...prev, {
      id: String(Date.now() + Math.random()),
      branchId: branches?.[0]?.id || '',
      date: '',
      shiftType: 'MORNING',
      employeeId: employees?.[0]?.id || '',
      notes: ''
    }]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, changes: Partial<Row>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  };

  const handleAssign = async () => {
    setMessage(null);
    setLoading(true);

    try {
      // Group rows by branch_date_shift
      const groups: Record<string, { branchId: string; date: string; shiftType: string; employeeIds: string[] } > = {};

      for (const r of rows) {
        if (!r.branchId || !r.date || !r.shiftType || !r.employeeId) {
          setMessage('All row fields (branch, date, shift, employee) are required.');
          setLoading(false);
          return;
        }
        const key = `${r.branchId}__${r.date}__${r.shiftType}`;
        if (!groups[key]) groups[key] = { branchId: r.branchId, date: r.date, shiftType: r.shiftType, employeeIds: [] };
        groups[key].employeeIds.push(r.employeeId);
      }

      // For each group, find existing shift_schedule or create one, then call bulkAssignEmployees
      for (const key of Object.keys(groups)) {
        const g = groups[key];

        // Try to find an existing shift schedule
        const found = await getShiftSchedules({ branchId: g.branchId, shiftType: g.shiftType, startDate: g.date, endDate: g.date, pageSize: 1 });
        let scheduleId: string | null = null;
        if (found && found.data && found.data.length > 0) {
          scheduleId = found.data[0].id;
        } else {
          // create shift schedule
          const fd = new FormData();
          fd.set('branch_id', g.branchId);
          fd.set('shift_type', g.shiftType);
          fd.set('shift_date', g.date);
          fd.set('required_staff_count', String(g.employeeIds.length));
          fd.set('notes', 'Created via bulk assignment');
          const created = await createShiftSchedule(fd);
          if (created?.error) {
            setMessage('Failed to create shift schedule: ' + created.error);
            setLoading(false);
            return;
          }
          // After creation, attempt to lookup it again
          const foundAfter = await getShiftSchedules({ branchId: g.branchId, shiftType: g.shiftType, startDate: g.date, endDate: g.date, pageSize: 1 });
          if (foundAfter && foundAfter.data && foundAfter.data.length > 0) {
            scheduleId = foundAfter.data[0].id;
          }
        }

        if (!scheduleId) {
          setMessage('Could not determine shift schedule id for one or more rows.');
          setLoading(false);
          return;
        }

        // Call bulkAssignEmployees
        const res = await bulkAssignEmployees(scheduleId, groups[key].employeeIds);
        if (res?.error) {
          setMessage('Assignment failed: ' + res.error);
          setLoading(false);
          return;
        }
      }

      setMessage('Assignments completed successfully.');
      setRows([{
        id: String(Date.now()),
        branchId: branches?.[0]?.id || '',
        date: '',
        shiftType: 'MORNING',
        employeeId: employees?.[0]?.id || '',
        notes: ''
      }]);

    } catch (e: any) {
      setMessage(e.message || 'Unexpected error during bulk assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Spreadsheet Assignments</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={addRow}><PlusCircle className="mr-2" /> Add Row</Button>
          <Button onClick={handleAssign} className="bg-[#0f172a]" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Assign'}
          </Button>
        </div>
      </div>

      {message && (
        <div className="mb-3 text-sm text-destructive">{message}</div>
      )}

      <div className="overflow-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-2 py-2 w-1/5">Branch</th>
              <th className="px-2 py-2 w-1/5">Date</th>
              <th className="px-2 py-2 w-1/5">Shift</th>
              <th className="px-2 py-2 w-1/5">Employee</th>
              <th className="px-2 py-2 w-1/5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t">
                <td className="p-2">
                  <select value={row.branchId} onChange={(e) => updateRow(row.id, { branchId: e.target.value })} className="w-full p-2 border rounded">
                    <option value="">Select branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input type="date" value={row.date} onChange={(e) => updateRow(row.id, { date: e.target.value })} className="w-full p-2 border rounded" />
                </td>
                <td className="p-2">
                  <select value={row.shiftType} onChange={(e) => updateRow(row.id, { shiftType: e.target.value })} className="w-full p-2 border rounded">
                    {SHIFT_TYPES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select value={row.employeeId} onChange={(e) => updateRow(row.id, { employeeId: e.target.value })} className="w-full p-2 border rounded">
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.users?.full_name || emp.id}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
