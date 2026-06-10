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
      events (event_date, branches (name)),
      employees (users (full_name)),
      shift_templates (name),
      attendance (*)
    `, { count: 'exact' })
    .neq('assignment_status', 'replaced');

  if (session.role === 'employee') {
    queryBuilder = queryBuilder.eq('employee_id', session.userId);
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
      const branchName = item.events?.branches?.name?.toLowerCase() || '';
      const shiftName = item.shift_templates?.name?.toLowerCase() || '';
      return empName.includes(cleanSearch) || branchName.includes(cleanSearch) || shiftName.includes(cleanSearch);
    });
    finalCount = finalData.length;
  }

  return { data: finalData, total: finalCount };
}

export async function markAttendance(assignmentId: string, status: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
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

    // Update assignment status to completed if they attended
    if (status === 'present' || status === 'late') {
      await supabase
        .from('assignments')
        .update({ assignment_status: 'completed' })
        .eq('id', assignmentId);
        
      // Also trigger payment creation for completed assignments (if not exists)
      const { data: assignment } = await supabase
        .from('assignments')
        .select('payment_snapshot')
        .eq('id', assignmentId)
        .single();
        
      if (assignment && assignment.payment_snapshot) {
        await supabase
          .from('payments')
          .insert([{
            assignment_id: assignmentId,
            amount: assignment.payment_snapshot,
            status: 'pending'
          }]);
      }
    } else if (status === 'absent') {
       await supabase
        .from('assignments')
        .update({ assignment_status: 'assigned' }) // or cancelled/absent if added to enum
        .eq('id', assignmentId);
    }
  }

  revalidatePath('/dashboard/attendance');
  return { success: true };
}
