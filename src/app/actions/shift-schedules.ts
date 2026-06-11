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
      assignments(id, assignment_status, attendance(attendance_status), payments(payment_status))
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
