'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getShifts() {
  const { data, error } = await supabase
    .from('shift_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shifts:', error);
    return [];
  }
  return data;
}

export async function getShiftById(id: string) {
  const { data, error } = await supabase
    .from('shift_templates')
    .select(`
      *,
      assignments (
        id, assignment_status,
        events (event_date, branches(name))
      ),
      branch_pay_rates (rate, effective_from, branches(name))
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createShift(formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const description = formData.get('description') as string;

  if (!name || !startTime || !endTime) {
    return { error: 'Name, start time, and end time are required' };
  }

  const payload = {
    name,
    start_time: startTime,
    end_time: endTime
  };

  const { data, error } = await supabase
    .from('shift_templates')
    .insert([payload])
    .select('id')
    .single();

  if (error) {
    return { error: 'Failed to create shift template' };
  }

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'shift_templates',
    entity_id: data.id,
    action: 'CREATE',
    new_values: payload
  }]);

  revalidatePath('/dashboard/shifts');
  return { success: true };
}

export async function updateShift(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const description = formData.get('description') as string;

  if (!name || !startTime || !endTime) {
    return { error: 'Name, start time, and end time are required' };
  }

  const { data: oldShift } = await supabase.from('shift_templates').select('*').eq('id', id).single();

  const payload = {
    name,
    start_time: startTime,
    end_time: endTime
  };

  const { error } = await supabase
    .from('shift_templates')
    .update(payload)
    .eq('id', id);

  if (error) return { error: 'Failed to update shift template' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'shift_templates',
    entity_id: id,
    action: 'UPDATE',
    old_values: oldShift,
    new_values: { ...oldShift, ...payload }
  }]);

  revalidatePath('/dashboard/shifts');
  revalidatePath(`/dashboard/shifts/${id}`);
  return { success: true };
}

export async function archiveShift(id: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: oldShift } = await supabase.from('shift_templates').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('shift_templates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return { error: 'Failed to archive shift template' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'shift_templates',
    entity_id: id,
    action: 'ARCHIVE',
    old_values: oldShift,
    new_values: { ...oldShift, is_active: false }
  }]);

  revalidatePath('/dashboard/shifts');
  return { success: true };
}
