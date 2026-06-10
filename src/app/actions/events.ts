'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getEvents(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  branchId?: string;
}) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const search = options?.search || '';
  const sortBy = options?.sortBy || 'event_date';
  const sortOrder = options?.sortOrder || 'asc';
  const branchId = options?.branchId;

  let queryBuilder = supabase
    .from('events')
    .select('*, branches(name)', { count: 'exact' })
    .eq('is_active', true);

  if (branchId && branchId !== 'all') {
    queryBuilder = queryBuilder.eq('branch_id', branchId);
  }

  if (search) {
    const { data: matchedBranches } = await supabase
      .from('branches')
      .select('id')
      .ilike('name', `%${search}%`);
    const branchIds = (matchedBranches || []).map((b: any) => b.id);

    let orCondition = `notes.ilike.%${search}%`;
    if (branchIds.length > 0) {
      orCondition += `,branch_id.in.(${branchIds.join(',')})`;
    }
    queryBuilder = queryBuilder.or(orCondition);
  }

  queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching events:', error);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function getEventById(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      branches (name),
      assignments (
        id, assignment_status,
        employees (users(full_name)),
        shift_templates (name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createEvent(formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const branchId = formData.get('branch_id') as string;
  const eventDate = formData.get('event_date') as string;
  const requiredStaff = formData.get('required_staff_count') as string;
  const notes = formData.get('notes') as string;

  if (!branchId || !eventDate || !requiredStaff) {
    return { error: 'All required fields must be filled' };
  }

  const payload = { 
    branch_id: branchId,
    event_date: eventDate,
    required_staff_count: parseInt(requiredStaff, 10),
    notes: notes || null,
    created_by: session.userId
  };

  const { data: newEvent, error } = await supabase
    .from('events')
    .insert([payload])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return { error: 'Failed to create event: ' + error.message };
  }

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'events',
    entity_id: newEvent.id,
    action: 'CREATE',
    new_values: payload
  }]);

  revalidatePath('/dashboard/events');
  return { success: true };
}

export async function updateEvent(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const requiredStaff = formData.get('required_staff_count') as string;
  const notes = formData.get('notes') as string;

  if (!requiredStaff) return { error: 'Required staff count is required' };

  const { data: oldEvent } = await supabase.from('events').select('*').eq('id', id).single();

  const payload = {
    required_staff_count: parseInt(requiredStaff, 10),
    notes: notes || null
  };

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id);

  if (error) return { error: 'Failed to update event' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'events',
    entity_id: id,
    action: 'UPDATE',
    old_values: oldEvent,
    new_values: { ...oldEvent, ...payload }
  }]);

  revalidatePath('/dashboard/events');
  revalidatePath(`/dashboard/events/${id}`);
  return { success: true };
}

export async function archiveEvent(id: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: oldEvent } = await supabase.from('events').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('events')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return { error: 'Failed to archive event' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'events',
    entity_id: id,
    action: 'ARCHIVE',
    old_values: oldEvent,
    new_values: { ...oldEvent, is_active: false }
  }]);

  revalidatePath('/dashboard/events');
  return { success: true };
}
