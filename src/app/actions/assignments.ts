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
      events (event_date, branch_id, branches (name)),
      employees (id, employee_code, phone, users (full_name, email)),
      shift_templates (name, start_time, end_time)
    `, { count: 'exact' });

  if (session.role === 'employee') {
    queryBuilder = queryBuilder.eq('employee_id', session.userId);
  }

  if (branchId && branchId !== 'all') {
    queryBuilder = queryBuilder.eq('events.branch_id', branchId);
  }

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('assignment_status', status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Since we order by created_at of the assignments, it is simple
  queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching assignments:', error);
    return { data: [], total: 0 };
  }

  // If there's a search term, filter in memory as a fallback or return subset,
  // but to preserve server-side pagination, we can filter in database if we use inner join.
  // Wait, let's filter in memory if they type search, but since we are paginating,
  // let's do a database query if possible, or filter the returned records.
  // Let's do database search for employees first to search by employee names:
  let finalData = data || [];
  let finalCount = count || 0;

  if (search && data) {
    const cleanSearch = search.toLowerCase();
    finalData = data.filter((item: any) => {
      const empName = item.employees?.users?.full_name?.toLowerCase() || '';
      const branchName = item.events?.branches?.name?.toLowerCase() || '';
      const shiftName = item.shift_templates?.name?.toLowerCase() || '';
      return empName.includes(cleanSearch) || branchName.includes(cleanSearch) || shiftName.includes(cleanSearch);
    });
    finalCount = finalData.length;
  }

  return { data: finalData, total: finalCount };
}

export async function getAvailableEmployees(eventId: string, shiftTemplateId: string) {
  // First get the event to know its date
  const { data: event } = await supabase.from('events').select('event_date').eq('id', eventId).single();
  if (!event) return [];

  // Get all active employees
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('id, users(full_name)')
    .eq('is_active', true)
    .eq('status', 'active');

  if (!allEmployees) return [];

  // Get current assignments for this date and shift
  // In a robust implementation, we'd check overlapping times, but here we check exact shift or simply any shift on that day
  // Let's check for exact shift overlap for simplicity
  const { data: existingAssignments } = await supabase
    .from('assignments')
    .select('employee_id')
    .eq('shift_template_id', shiftTemplateId)
    .eq('assignment_status', 'assigned')
    .eq('events.event_date', event.event_date); // this requires inner join or we fetch all on that date

  // Correct way to check same date overlaps:
  const { data: dateAssignments } = await supabase
    .from('assignments')
    .select('employee_id, shift_template_id, events!inner(event_date)')
    .eq('events.event_date', event.event_date)
    .in('assignment_status', ['assigned', 'completed']);

  // We should fetch the shift templates to check time overlap, but checking exact shift ID is a baseline
  const assignedEmployeeIds = new Set(dateAssignments?.filter(a => a.shift_template_id === shiftTemplateId).map(a => a.employee_id) || []);

  const available = allEmployees.filter(emp => !assignedEmployeeIds.has(emp.id));
  return available;
}

async function validateEmployeeAssignment(
  employeeId: string,
  eventId: string,
  shiftTemplateId: string,
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

  // 2. Check if event is active and get date
  const { data: rawEvent, error: eventErr } = await supabase
    .from('events')
    .select('is_active, event_date, branch_id, branches(name)')
    .eq('id', eventId)
    .single();
  if (eventErr || !rawEvent) return { valid: false, error: 'Event not found.' };
  const event = rawEvent as any;
  if (!event.is_active) return { valid: false, error: 'Event is not active.' };

  // 3. Get new shift details
  const { data: rawShift, error: shiftErr } = await supabase
    .from('shift_templates')
    .select('name, start_time, end_time, is_active')
    .eq('id', shiftTemplateId)
    .single();
  if (shiftErr || !rawShift) return { valid: false, error: 'Shift template not found.' };
  const newShift = rawShift as any;
  if (!newShift.is_active) return { valid: false, error: 'Shift template is not active.' };

  // 4. Fetch sibling active assignments on the same event_date
  let siblingQuery = supabase
    .from('assignments')
    .select(`
      id,
      shift_template_id,
      assignment_status,
      events!inner (event_date, branch_id, branches(name)),
      shift_templates!inner (name, start_time, end_time)
    `)
    .eq('employee_id', employeeId)
    .eq('events.event_date', event.event_date)
    .in('assignment_status', ['assigned', 'completed']);

  if (excludeAssignmentId) {
    siblingQuery = siblingQuery.neq('id', excludeAssignmentId);
  }

  const { data: siblingData, error: siblingErr } = await siblingQuery;
  if (siblingErr) return { valid: false, error: 'Failed to validate schedule conflicts.' };
  const siblingAssignments = (siblingData || []) as any[];

  for (const sibling of siblingAssignments) {
    const isSameShift = sibling.shift_template_id === shiftTemplateId;
    if (isSameShift) {
      const siblingEvent = Array.isArray(sibling.events) ? sibling.events[0] : sibling.events;
      if (siblingEvent?.branch_id === event.branch_id) {
        return { valid: false, error: `Employee ${empName} is already assigned to this shift.` };
      } else {
        const siblingBranch = Array.isArray(siblingEvent?.branches) ? siblingEvent.branches[0] : siblingEvent?.branches;
        return { valid: false, error: `Employee ${empName} has a branch conflict (already assigned to ${siblingBranch?.name || 'another branch'} for the same shift).` };
      }
    }

    // Check overlap of start_time and end_time
    const siblingShift = Array.isArray(sibling.shift_templates) ? sibling.shift_templates[0] : sibling.shift_templates;
    const s1 = newShift.start_time;
    const e1 = newShift.end_time;
    const s2 = siblingShift?.start_time;
    const e2 = siblingShift?.end_time;

    if (s1 && e1 && s2 && e2 && s1 < e2 && s2 < e1) {
      const siblingEvent = Array.isArray(sibling.events) ? sibling.events[0] : sibling.events;
      const siblingBranch = Array.isArray(siblingEvent?.branches) ? siblingEvent.branches[0] : siblingEvent?.branches;
      const branchName = siblingBranch?.name || 'another branch';
      return { 
        valid: false, 
        error: `Employee ${empName} has a scheduling conflict with shift '${siblingShift?.name || 'other'}' (${s2} - ${e2}) at ${branchName}.` 
      };
    }
  }

  return { valid: true };
}

export async function createAssignment(eventId: string, shiftTemplateId: string, employeeIds: string[]) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  // Validate each employee first
  for (const empId of employeeIds) {
    const validation = await validateEmployeeAssignment(empId, eventId, shiftTemplateId);
    if (!validation.valid) {
      return { error: validation.error };
    }
  }

  // Get Event to find branch_id
  const { data: event } = await supabase.from('events').select('branch_id, event_date').eq('id', eventId).single();
  if (!event) return { error: 'Event not found' };

  // Get Payment Rate
  let query = supabase
    .from('branch_pay_rates')
    .select('rate, effective_to')
    .eq('branch_id', event.branch_id)
    .eq('shift_template_id', shiftTemplateId)
    .lte('effective_from', event.event_date)
    .order('effective_from', { ascending: false });

  const { data: rates } = await query;
  
  // Filter for the one where effective_to is null or >= event_date
  const activeRateData = rates?.find(r => !r.effective_to || r.effective_to >= event.event_date);
  
  const rate = activeRateData ? activeRateData.rate : 0; // Default to 0 if rate not set

  // Prepare insertions
  const inserts = employeeIds.map(empId => ({
    event_id: eventId,
    employee_id: empId,
    shift_template_id: shiftTemplateId,
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
      reason: 'Initial assignment'
    }));
    await supabase.from('assignment_history').insert(historyInserts);
  }

  revalidatePath('/dashboard/assignments');
  return { success: true };
}

export async function replaceAssignment(assignmentId: string, newEmployeeId: string, reason: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: currentAssignment } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
  if (!currentAssignment) return { error: 'Assignment not found' };

  // Validate the replacement employee
  const validation = await validateEmployeeAssignment(newEmployeeId, currentAssignment.event_id, currentAssignment.shift_template_id, assignmentId);
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
      event_id: currentAssignment.event_id,
      employee_id: newEmployeeId,
      shift_template_id: currentAssignment.shift_template_id,
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
  return { success: true };
}
