'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function globalSearch(query: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { employees: [], branches: [], shiftSchedules: [] };
  }

  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return { employees: [], branches: [], shiftSchedules: [] };
  }

  // 1. Search employees (joining users)
  const { data: employees } = await supabase
    .from('employees')
    .select(`
      id, employee_code, phone, status,
      users (full_name, email)
    `)
    .eq('is_active', true) as any;

  const filteredEmployees = employees?.filter((emp: any) => 
    emp.employee_code.toLowerCase().includes(cleanQuery) ||
    emp.phone.toLowerCase().includes(cleanQuery) ||
    emp.users?.full_name.toLowerCase().includes(cleanQuery) ||
    emp.users?.email.toLowerCase().includes(cleanQuery)
  ) || [];

  // 2. Search branches
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`);

  // 3. Search shift schedules
  const { data: shiftSchedules } = await supabase
    .from('shift_schedules')
    .select('id, shift_date, notes, branches(name), shift_templates(name)')
    .eq('is_active', true) as any;

  const filteredShiftSchedules = shiftSchedules?.filter((ev: any) => 
    ev.shift_date.toLowerCase().includes(cleanQuery) ||
    ev.branches?.name.toLowerCase().includes(cleanQuery) ||
    ev.shift_templates?.name.toLowerCase().includes(cleanQuery) ||
    (ev.notes && ev.notes.toLowerCase().includes(cleanQuery))
  ) || [];

  return {
    employees: filteredEmployees.slice(0, 10),
    branches: (branches || []).slice(0, 10),
    shiftSchedules: filteredShiftSchedules.slice(0, 10)
  };
}
