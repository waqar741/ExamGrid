'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getAssignmentsForAttendance(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const session = await getSession();
  if (!session) return { data: [], total: 0 };

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const search = options?.search || '';
  const sortBy = options?.sortBy || 'created_at';
  const sortOrder = options?.sortOrder || 'desc';

  let queryBuilder = supabase
    .from('assignments')
    .select(`
      *,
      shift_schedules (shift_date, shift_type, branches (name)),
      employees (users (full_name)),
      attendance (*)
    `, { count: 'exact' })
    .neq('assignment_status', 'replaced');

  if (session.role === 'employee') {
    const { data: empData } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', session.userId)
      .single();
    
    if (empData) {
      queryBuilder = queryBuilder.eq('employee_id', empData.id);
    } else {
      // If no employee record found, return empty
      return { data: [], total: 0 };
    }
  }

  // Filter out assignments that have a 'paid' payment
  const { data: paidPayments } = await supabase
    .from('payments')
    .select('assignment_id')
    .eq('payment_status', 'paid');
  
  const paidIds = paidPayments?.map(p => p.assignment_id) || [];
  if (paidIds.length > 0) {
    // Use up to 200 to prevent URI Too Long errors in standard environments
    queryBuilder = queryBuilder.not('id', 'in', `(${paidIds.slice(0, 200).join(',')})`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching assignments for attendance:', error);
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

export async function markAttendance(assignmentId: string, status: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  // If employee, verify they own the assignment
  if (session.role === 'employee') {
    const { data: empData } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', session.userId)
      .single();

    const { data: assignment } = await supabase
      .from('assignments')
      .select('employee_id')
      .eq('id', assignmentId)
      .single();
    
    if (!assignment || !empData || assignment.employee_id !== empData.id) {
      return { error: 'Unauthorized to mark attendance for this shift' };
    }
  }

  // Check if attendance already exists
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, attendance_status')
    .eq('assignment_id', assignmentId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('attendance')
      .update({ attendance_status: status, marked_by: session.userId })
      .eq('id', existing.id);
    if (error) return { error: 'Failed to update attendance' };
    
    await supabase.from('audit_logs').insert([{
      user_id: session.userId,
      entity_type: 'attendance',
      entity_id: existing.id,
      action: 'UPDATE',
      old_values: { attendance_status: existing.attendance_status },
      new_values: { attendance_status: status }
    }]);
  } else {
    const { data: newAtt, error } = await supabase
      .from('attendance')
      .insert([{
        assignment_id: assignmentId,
        attendance_status: status,
        marked_by: session.userId
      }])
      .select('id')
      .single();
    if (error) return { error: 'Failed to mark attendance' };

    await supabase.from('audit_logs').insert([{
      user_id: session.userId,
      entity_type: 'attendance',
      entity_id: newAtt.id,
      action: 'CREATE',
      new_values: { assignment_id: assignmentId, attendance_status: status }
    }]);

    // Update assignment status to completed if they attended or skipped
    if (status === 'present' || status === 'late' || status === 'skipped') {
      await supabase
        .from('assignments')
        .update({ assignment_status: 'completed' })
        .eq('id', assignmentId);
    } else if (status === 'absent') {
       await supabase
        .from('assignments')
        .update({ assignment_status: 'assigned' })
        .eq('id', assignmentId);
    }
  }

  revalidatePath('/dashboard/attendance');
  return { success: true };
}
