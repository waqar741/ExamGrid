'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getShiftSchedules(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  branchId?: string;
  shiftType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const search = options?.search || '';
  const sortBy = options?.sortBy || 'shift_date';
  const sortOrder = options?.sortOrder || 'asc';
  
  let queryBuilder = supabase
    .from('shift_schedules')
    .select(`
      *, 
      branches(name),
      assignments(id, assignment_status, payment_snapshot, attendance(attendance_status), payments(payment_status, amount))
    `, { count: 'exact' })
    .eq('is_active', true);

  if (options?.branchId && options.branchId !== 'all') {
    queryBuilder = queryBuilder.eq('branch_id', options.branchId);
  }
  
  if (options?.shiftType && options.shiftType !== 'all') {
    queryBuilder = queryBuilder.eq('shift_type', options.shiftType);
  }

  if (options?.startDate) {
    queryBuilder = queryBuilder.gte('shift_date', options.startDate);
  }
  if (options?.endDate) {
    queryBuilder = queryBuilder.lte('shift_date', options.endDate);
  }

  if (search) {
    // Search in branch names and notes
    const { data: matchedBranches } = await supabase
      .from('branches')
      .select('id')
      .ilike('name', `%${search}%`);

    const branchIds = (matchedBranches || []).map((b: any) => b.id);

    let orConditions = [];
    if (branchIds.length > 0) {
      orConditions.push(`branch_id.in.(${branchIds.join(',')})`);
    }
    
    // Search directly in shift_type and notes
    orConditions.push(`shift_type.ilike.%${search}%`);
    orConditions.push(`notes.ilike.%${search}%`);

    queryBuilder = queryBuilder.or(orConditions.join(','));
  }

  queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching shift schedules:', error);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function getShiftScheduleById(id: string) {
  const { data, error } = await supabase
    .from('shift_schedules')
    .select(`
      *,
      branches (name),
      assignments (
        id, assignment_status,
        employees (id, user_id, employee_code, phone, users(full_name)),
        attendance (attendance_status, remarks),
        payments (amount, payment_status)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching shift by ID:', error);
    return null;
  }
  return data;
}

export async function createShiftSchedule(formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const branchId = formData.get('branch_id') as string;
  const shiftType = formData.get('shift_type') as string;
  const shiftDate = formData.get('shift_date') as string;
  const requiredStaff = formData.get('required_staff_count') as string;
  const notes = formData.get('notes') as string;

  if (!branchId || !shiftType || !shiftDate || !requiredStaff) {
    return { error: 'All required fields must be filled' };
  }

  const payload = { 
    branch_id: branchId,
    shift_type: shiftType,
    shift_date: shiftDate,
    required_staff_count: parseInt(requiredStaff, 10),
    notes: notes || null,
    created_by: session.userId
  };

  const { data: newShift, error } = await supabase
    .from('shift_schedules')
    .insert([payload])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating shift schedule:', error);
    return { error: 'Failed to create shift schedule: ' + error.message };
  }

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'shift_schedules',
    entity_id: newShift.id,
    action: 'CREATE',
    new_values: payload
  }]);

  revalidatePath('/dashboard/shift-schedule');
  return { success: true };
}

export async function createBulkShifts(payload: {
  dates: string[];
  branchIds: string[];
  shiftTypes: string[];
  requiredStaffPerShift: Record<string, number>; 
  // key formatted as `${branchId}_${shiftType}`
}) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const inserts = [];

  for (const date of payload.dates) {
    for (const branchId of payload.branchIds) {
      for (const shiftType of payload.shiftTypes) {
        const staffKey = `${branchId}_${shiftType}`;
        const requiredStaff = payload.requiredStaffPerShift[staffKey] || 0;
        
        if (requiredStaff > 0) {
          inserts.push({
            branch_id: branchId,
            shift_type: shiftType,
            shift_date: date,
            required_staff_count: requiredStaff,
            created_by: session.userId
          });
        }
      }
    }
  }

  if (inserts.length === 0) return { error: 'No shifts to create based on requirements' };

  const { data: newShifts, error } = await supabase
    .from('shift_schedules')
    .insert(inserts)
    .select('id');

  if (error) {
    console.error('Error bulk creating shift schedules:', error);
    return { error: 'Failed to bulk create shift schedules: ' + error.message };
  }

  // Audit log for bulk creation
  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'shift_schedules',
    entity_id: newShifts[0].id, // Reference first one
    action: 'BULK_CREATE',
    new_values: { count: inserts.length, details: inserts }
  }]);

  revalidatePath('/dashboard/shift-schedule');
  return { success: true, count: inserts.length };
}

export async function updateShiftSchedule(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const requiredStaff = formData.get('required_staff_count') as string;
  const notes = formData.get('notes') as string;

  if (!requiredStaff) return { error: 'Required staff count is required' };

  const { data: oldShift } = await supabase.from('shift_schedules').select('*').eq('id', id).single();

  const payload = {
    required_staff_count: parseInt(requiredStaff, 10),
    notes: notes || null
  };

  const { error } = await supabase
    .from('shift_schedules')
    .update(payload)
    .eq('id', id);

  if (error) return { error: 'Failed to update shift schedule' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'shift_schedules',
    entity_id: id,
    action: 'UPDATE',
    old_values: oldShift,
    new_values: { ...oldShift, ...payload }
  }]);

  revalidatePath('/dashboard/shift-schedule');
  revalidatePath(`/dashboard/shift-schedule/${id}`);
  return { success: true };
}

export async function archiveShiftSchedule(id: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: oldShift } = await supabase.from('shift_schedules').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('shift_schedules')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return { error: 'Failed to archive shift schedule' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'shift_schedules',
    entity_id: id,
    action: 'ARCHIVE',
    old_values: oldShift,
    new_values: { ...oldShift, is_active: false }
  }]);

  revalidatePath('/dashboard/shift-schedule');
  return { success: true };
}

export async function createBulkSpreadsheetShifts(rows: {
  employeeId: string;
  branchId: string;
  date: string;
  shiftType: string;
  notes?: string;
  paymentAmount?: number;
}[]) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  if (!rows || rows.length === 0) {
    return { error: 'No rows to process' };
  }

  // To prevent creating duplicate shift schedules for the same (branch, date, shift_type),
  // we first group them and find or create them.
  const shiftMap = new Map<string, string>(); // key -> shiftScheduleId

  for (const row of rows) {
    const key = `${row.branchId}_${row.date}_${row.shiftType}`;
    
    if (!shiftMap.has(key)) {
      // Find existing
      const { data: existing } = await supabase
        .from('shift_schedules')
        .select('id, required_staff_count')
        .eq('branch_id', row.branchId)
        .eq('shift_date', row.date)
        .eq('shift_type', row.shiftType)
        .single();
        
      if (existing) {
        shiftMap.set(key, existing.id);
      } else {
        const payload = {
          branch_id: row.branchId,
          shift_type: row.shiftType,
          shift_date: row.date,
          required_staff_count: 1, // Will be incremented or at least 1
          notes: row.notes || null,
          created_by: session.userId
        };
        
        const { data: newShift, error } = await supabase
          .from('shift_schedules')
          .insert([payload])
          .select('id')
          .single();
          
        if (newShift) {
          shiftMap.set(key, newShift.id);
          
          await supabase.from('audit_logs').insert([{
            user_id: session.userId,
            entity_type: 'shift_schedules',
            entity_id: newShift.id,
            action: 'CREATE',
            new_values: payload
          }]);
        }
      }
    }
    
    // Now we have the shift schedule ID
    const shiftScheduleId = shiftMap.get(key);
    if (!shiftScheduleId) continue;

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('assignments')
      .select('id')
      .eq('shift_schedule_id', shiftScheduleId)
      .eq('employee_id', row.employeeId)
      .in('assignment_status', ['assigned', 'completed'])
      .single();
      
    if (!existingAssignment) {
      // We need to insert the assignment
      let rate = row.paymentAmount;
      if (rate === undefined || rate === null || isNaN(rate)) {
        // Get Payment Rate based on branch_id and shift_type
        const { data: rates } = await supabase
          .from('branch_pay_rates')
          .select('rate, effective_from, effective_to')
          .eq('branch_id', row.branchId)
          .eq('shift_type', row.shiftType)
          .lte('effective_from', row.date)
          .order('effective_from', { ascending: false });

        const activeRateData = rates?.find(r => !r.effective_to || r.effective_to >= row.date);
        rate = activeRateData ? activeRateData.rate : 0;
      }
      
      const { data: newAssignment } = await supabase
        .from('assignments')
        .insert([{
          shift_schedule_id: shiftScheduleId,
          employee_id: row.employeeId,
          payment_snapshot: rate,
          assigned_by: session.userId,
          assignment_status: 'assigned'
        }])
        .select('id')
        .single();
        
      if (newAssignment) {
        await supabase.from('assignment_history').insert([{
          assignment_id: newAssignment.id,
          action_type: 'assigned',
          new_employee_id: row.employeeId,
          action_by: session.userId,
          reason: 'Spreadsheet bulk assignment'
        }]);

        // Sync with Admin Payment Page
        await supabase.from('payments').insert([{
          assignment_id: newAssignment.id,
          amount: rate,
          payment_status: 'not_requested',
          created_by: session.userId
        }]);
      }
    }
  }

  revalidatePath('/dashboard/shift-schedule');
  revalidatePath('/dashboard/assignments');
  return { success: true };
}

export async function requestSelfShift(branchId: string, shiftDate: string, shiftType: string) {
  const session = await getSession();
  if (!session || session.role !== 'employee') {
    return { error: 'Unauthorized. Only employees can request shifts.' };
  }

  // 1. Get employee ID
  const { data: empData, error: empErr } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .single();

  if (empErr || !empData) return { error: 'Employee profile not found.' };

  // 2. Check if schedule already exists
  let scheduleId;
  const { data: schedule } = await supabase
    .from('shift_schedules')
    .select('id, required_staff_count')
    .eq('branch_id', branchId)
    .eq('shift_date', shiftDate)
    .eq('shift_type', shiftType)
    .single();

  if (schedule) {
    scheduleId = schedule.id;
  } else {
    // 3. Create schedule if it doesn't exist
    const { data: newSchedule, error: newErr } = await supabase
      .from('shift_schedules')
      .insert({
        branch_id: branchId,
        shift_date: shiftDate,
        shift_type: shiftType,
        required_staff_count: 1,
        created_by: session.userId
      })
      .select('id')
      .single();
    if (newErr) return { error: newErr.message };
    scheduleId = newSchedule.id;
  }

  // 4. Check if already assigned
  const { data: existingAssignment } = await supabase
    .from('assignments')
    .select('id')
    .eq('shift_schedule_id', scheduleId)
    .eq('employee_id', empData.id)
    .single();
  
  if (existingAssignment) {
    return { error: 'You are already assigned to this shift.' };
  }

  // 5. Get Payment Rate
  const { data: rates } = await supabase
    .from('branch_pay_rates')
    .select('rate, effective_to')
    .eq('branch_id', branchId)
    .eq('shift_type', shiftType)
    .lte('effective_from', shiftDate)
    .order('effective_from', { ascending: false });

  const activeRateData = rates?.find(r => !r.effective_to || r.effective_to >= shiftDate);
  const rate = activeRateData ? activeRateData.rate : 0;

  // 6. Create Assignment
  const { error: assignErr } = await supabase
    .from('assignments')
    .insert({
      shift_schedule_id: scheduleId,
      employee_id: empData.id,
      assignment_status: 'pending',
      payment_snapshot: rate,
      assigned_by: session.userId
    });
  
  if (assignErr) return { error: assignErr.message };

  revalidatePath('/dashboard/calendar');
  return { success: true };
}
