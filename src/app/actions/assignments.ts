'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getAssignments(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  branchId?: string;
  status?: string;
}) {
  const session = await getSession();
  if (!session) return { data: [], total: 0 };

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const search = options?.search || '';
  const sortBy = options?.sortBy || 'created_at';
  const sortOrder = options?.sortOrder || 'desc';
  const branchId = options?.branchId;
  const status = options?.status;

  let queryBuilder = supabase
    .from('assignments')
    .select(`
      *,
      shift_schedules!inner (shift_date, branch_id, shift_type, branches (name)),
      employees!inner (id, employee_code, phone, users (full_name, email))
    `, { count: 'exact' });

  if (session.role === 'employee') {
    queryBuilder = queryBuilder.eq('employee_id', session.userId);
  }

  if (branchId && branchId !== 'all') {
    queryBuilder = queryBuilder.eq('shift_schedules.branch_id', branchId);
  }

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('assignment_status', status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching assignments:', error);
    return { data: [], total: 0 };
  }

  let finalData = data || [];
  let finalCount = count || 0;

  if (search && data) {
    const cleanSearch = search.toLowerCase();
    finalData = data.filter((item: any) => {
      const empName = item.employees?.users?.full_name?.toLowerCase() || '';
      const branchName = item.shift_schedules?.branches?.name?.toLowerCase() || '';
      const shiftName = item.shift_schedules?.shift_type?.toLowerCase() || '';
      return empName.includes(cleanSearch) || branchName.includes(cleanSearch) || shiftName.includes(cleanSearch);
    });
    finalCount = finalData.length;
  }

  return { data: finalData, total: finalCount };
}

export async function getSmartAvailability(shiftScheduleId: string) {
  // Get the shift schedule details
  const { data: schedule } = await supabase
    .from('shift_schedules')
    .select('shift_date, shift_type')
    .eq('id', shiftScheduleId)
    .single();

  if (!schedule) return { available: [], alreadyAssigned: [], conflict: [], unavailable: [] };
  
  const targetShiftDate = schedule.shift_date;
  const targetShiftType = schedule.shift_type;

  // Get all employees
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('id, is_active, status, users(full_name)');

  if (!allEmployees) return { available: [], alreadyAssigned: [], conflict: [], unavailable: [] };

  // Get all active assignments for that date
  const { data: dateAssignments } = await supabase
    .from('assignments')
    .select('employee_id, shift_schedule_id, assignment_status, shift_schedules!inner(shift_date, shift_type)')
    .eq('shift_schedules.shift_date', targetShiftDate)
    .in('assignment_status', ['assigned', 'completed']);

  const available = [];
  const alreadyAssigned = [];
  const conflict = [];
  const unavailable = [];

  for (const emp of allEmployees) {
    const empName = (Array.isArray(emp.users) ? (emp.users[0] as any)?.full_name : (emp.users as any)?.full_name) || 'Unknown';
    const empData = { id: emp.id, name: empName };

    if (!emp.is_active || emp.status !== 'active') {
      unavailable.push(empData);
      continue;
    }

    // Check assignments for this employee on the target date
    const empAssignments = dateAssignments?.filter(a => a.employee_id === emp.id) || [];
    
    let isAlreadyAssigned = false;
    let hasConflict = false;

    for (const a of empAssignments) {
      if (a.shift_schedule_id === shiftScheduleId) {
        isAlreadyAssigned = true;
        break;
      }
      
      const aSchedule = Array.isArray(a.shift_schedules) ? a.shift_schedules[0] : a.shift_schedules;
      const sType = (aSchedule as any)?.shift_type;

      if (targetShiftType === 'FULL_DAY' || sType === 'FULL_DAY' || targetShiftType === sType) {
        hasConflict = true;
      }
    }

    if (isAlreadyAssigned) {
      alreadyAssigned.push(empData);
    } else if (hasConflict) {
      conflict.push(empData);
    } else {
      available.push(empData);
    }
  }

  return { available, alreadyAssigned, conflict, unavailable };
}

async function validateEmployeeAssignment(
  employeeId: string,
  shiftScheduleId: string,
  excludeAssignmentId?: string
) {
  // 1. Check if employee is active
  const { data: rawEmployee, error: empErr } = await supabase
    .from('employees')
    .select('is_active, status, users(full_name)')
    .eq('id', employeeId)
    .single();
  if (empErr || !rawEmployee) return { valid: false, error: 'Employee not found.' };
  const employee = rawEmployee as any;
  const empName = (Array.isArray(employee.users) ? employee.users[0]?.full_name : employee.users?.full_name) || employeeId;

  if (!employee.is_active || employee.status !== 'active') {
    return { valid: false, error: `Employee ${empName} is not active.` };
  }

  // 2. Check if schedule is active and get date
  const { data: rawSchedule, error: schedErr } = await supabase
    .from('shift_schedules')
    .select('is_active, shift_date, branch_id, shift_type, branches(name)')
    .eq('id', shiftScheduleId)
    .single();
  if (schedErr || !rawSchedule) return { valid: false, error: 'Shift schedule not found.' };
  const schedule = rawSchedule as any;
  if (!schedule.is_active) return { valid: false, error: 'Shift schedule is not active.' };

  // 3. Fetch sibling active assignments on the same shift_date
  let siblingQuery = supabase
    .from('assignments')
    .select(`
      id,
      shift_schedule_id,
      assignment_status,
      shift_schedules!inner (shift_date, branch_id, shift_type, branches(name))
    `)
    .eq('employee_id', employeeId)
    .eq('shift_schedules.shift_date', schedule.shift_date)
    .in('assignment_status', ['assigned', 'completed']);

  if (excludeAssignmentId) {
    siblingQuery = siblingQuery.neq('id', excludeAssignmentId);
  }

  const { data: siblingData, error: siblingErr } = await siblingQuery;
  if (siblingErr) return { valid: false, error: 'Failed to validate schedule conflicts.' };
  const siblingAssignments = (siblingData || []) as any[];

  for (const sibling of siblingAssignments) {
    if (sibling.shift_schedule_id === shiftScheduleId) {
      return { valid: false, error: `Employee ${empName} is already assigned to this shift.` };
    }

    const siblingSchedule = Array.isArray(sibling.shift_schedules) ? sibling.shift_schedules[0] : sibling.shift_schedules;
    const sType = siblingSchedule?.shift_type;
    const tType = schedule.shift_type;

    if (tType === 'FULL_DAY' || sType === 'FULL_DAY' || tType === sType) {
      const siblingBranch = Array.isArray(siblingSchedule?.branches) ? siblingSchedule.branches[0] : siblingSchedule?.branches;
      const branchName = siblingBranch?.name || 'another branch';
      return { 
        valid: false, 
        error: `Employee ${empName} has a scheduling conflict with shift '${sType}' at ${branchName}.` 
      };
    }
  }

  return { valid: true };
}

export async function bulkAssignEmployees(shiftScheduleId: string, employeeIds: string[]) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  // Validate each employee first
  for (const empId of employeeIds) {
    const validation = await validateEmployeeAssignment(empId, shiftScheduleId);
    if (!validation.valid) {
      return { error: validation.error };
    }
  }

  // Get Schedule to find branch_id, shift_date, and shift_type
  const { data: schedule } = await supabase.from('shift_schedules').select('branch_id, shift_date, shift_type').eq('id', shiftScheduleId).single();
  if (!schedule) return { error: 'Shift schedule not found' };

  // Get Payment Rate based on branch_id and shift_type
  const { data: rates } = await supabase
    .from('branch_pay_rates')
    .select('rate, effective_from, effective_to')
    .eq('branch_id', schedule.branch_id)
    .eq('shift_type', schedule.shift_type)
    .lte('effective_from', schedule.shift_date)
    .order('effective_from', { ascending: false });

  if (!rates) {
    return { error: 'Failed to fetch payment rates' };
  }
  
  // Filter for the one where effective_to is null or >= shift_date
  const activeRateData = rates.find(r => !r.effective_to || r.effective_to >= schedule.shift_date);
  
  const rate = activeRateData ? activeRateData.rate : 0; // Default to 0 if rate not set

  // Prepare insertions
  const inserts = employeeIds.map(empId => ({
    shift_schedule_id: shiftScheduleId,
    employee_id: empId,
    payment_snapshot: rate,
    assigned_by: session.userId,
    assignment_status: 'assigned'
  }));

  const { data: newAssignments, error } = await supabase
    .from('assignments')
    .insert(inserts)
    .select('id, employee_id');

  if (error) {
    return { error: 'Failed to create assignments: ' + error.message };
  }

  // Record history
  if (newAssignments) {
    const historyInserts = newAssignments.map(a => ({
      assignment_id: a.id,
      action_type: 'assigned',
      new_employee_id: a.employee_id,
      action_by: session.userId,
      reason: 'Bulk assignment'
    }));
    await supabase.from('assignment_history').insert(historyInserts);
  }

  revalidatePath('/dashboard/assignments');
  revalidatePath('/dashboard/shift-schedule/' + shiftScheduleId);
  return { success: true };
}

// Backward compatibility or singular create
export async function createAssignment(shiftScheduleId: string, employeeIds: string[]) {
  return bulkAssignEmployees(shiftScheduleId, employeeIds);
}

export async function replaceAssignment(assignmentId: string, newEmployeeId: string, reason: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: currentAssignment } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
  if (!currentAssignment) return { error: 'Assignment not found' };

  // Validate the replacement employee
  const validation = await validateEmployeeAssignment(newEmployeeId, currentAssignment.shift_schedule_id, assignmentId);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // Update old assignment to replaced
  const { error: updateError } = await supabase
    .from('assignments')
    .update({ assignment_status: 'replaced', updated_at: new Date().toISOString() })
    .eq('id', assignmentId);

  if (updateError) return { error: 'Failed to update old assignment' };

  // Create new assignment
  const { data: newAssignment, error: insertError } = await supabase
    .from('assignments')
    .insert([{
      shift_schedule_id: currentAssignment.shift_schedule_id,
      employee_id: newEmployeeId,
      payment_snapshot: currentAssignment.payment_snapshot,
      assigned_by: session.userId,
      assignment_status: 'assigned'
    }])
    .select('id')
    .single();

  if (insertError || !newAssignment) return { error: 'Failed to create replacement assignment' };

  // Record history
  await supabase.from('assignment_history').insert([{
    assignment_id: currentAssignment.id,
    action_type: 'replaced',
    old_employee_id: currentAssignment.employee_id,
    new_employee_id: newEmployeeId,
    reason,
    action_by: session.userId
  }]);

  revalidatePath('/dashboard/assignments');
  revalidatePath('/dashboard/shift-schedule/' + currentAssignment.shift_schedule_id);
  return { success: true };
}

export async function removeAssignment(assignmentId: string, reason: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  if (!reason || reason.trim() === '') {
    return { error: 'Reason for removal is required.' };
  }

  // Get current assignment
  const { data: currentAssignment, error: getErr } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (getErr || !currentAssignment) {
    return { error: 'Assignment not found.' };
  }

  // Update status to 'removed'
  const { error: updateErr } = await supabase
    .from('assignments')
    .update({ assignment_status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', assignmentId);

  if (updateErr) {
    return { error: 'Failed to remove assignment.' };
  }

  // Record history
  await supabase.from('assignment_history').insert([{
    assignment_id: assignmentId,
    action_type: 'removed',
    old_employee_id: currentAssignment.employee_id,
    new_employee_id: null,
    reason,
    action_by: session.userId
  }]);

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'assignments',
    entity_id: assignmentId,
    action: 'REMOVE',
    old_values: currentAssignment,
    new_values: { ...currentAssignment, assignment_status: 'removed' }
  }]);

  revalidatePath('/dashboard/assignments');
  revalidatePath('/dashboard/shift-schedule/' + currentAssignment.shift_schedule_id);
  return { success: true };
}
