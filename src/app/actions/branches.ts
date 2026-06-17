'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getBranches(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const session = await getSession();
  if (!session || session.role === 'employee') return { data: [], total: 0 };

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const search = options?.search || '';
  const sortBy = options?.sortBy || 'created_at';
  const sortOrder = options?.sortOrder || 'desc';

  let queryBuilder = supabase
    .from('branches')
    .select('*, shift_schedules(id)', { count: 'exact' })
    .eq('is_active', true);

  if (search) {
    queryBuilder = queryBuilder.or(`name.ilike."%${search}%",description.ilike."%${search}%"`);
  }

  queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching branches:', error);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function getBranchById(id: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') return null;

  const { data, error } = await supabase
    .from('branches')
    .select(`
      *,
      events (
        id,
        event_date,
        required_staff_count,
        is_active,
        assignments (
          id,
          employees (
            id,
            status,
            users (
              full_name
            )
          )
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createBranch(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const availableShiftsRaw = formData.get('available_shift_types') as string;
  
  let available_shift_types = ['MORNING', 'AFTERNOON', 'FULL_DAY'];
  if (availableShiftsRaw) {
    try {
      available_shift_types = JSON.parse(availableShiftsRaw);
    } catch(e) {}
  }

  if (!name) return { error: 'Name is required' };

  const { data, error } = await supabase
    .from('branches')
    .insert([{ name, description, available_shift_types }])
    .select('id')
    .single();

  if (error) return { error: 'Failed to create branch' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'branches',
    entity_id: data.id,
    action: 'CREATE',
    new_values: { name, description, available_shift_types }
  }]);

  revalidatePath('/dashboard/branches');
  return { success: true };
}

export async function updateBranch(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const availableShiftsRaw = formData.get('available_shift_types') as string;
  
  let available_shift_types = ['MORNING', 'AFTERNOON', 'FULL_DAY'];
  if (availableShiftsRaw) {
    try {
      available_shift_types = JSON.parse(availableShiftsRaw);
    } catch(e) {}
  }

  if (!name) return { error: 'Name is required' };

  const { data: oldBranch } = await supabase.from('branches').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('branches')
    .update({ name, description, available_shift_types, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: 'Failed to update branch' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'branches',
    entity_id: id,
    action: 'UPDATE',
    old_values: oldBranch,
    new_values: { ...oldBranch, name, description, available_shift_types }
  }]);

  revalidatePath('/dashboard/branches');
  revalidatePath(`/dashboard/branches/${id}`);
  return { success: true };
}

export async function archiveBranch(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return { error: 'Unauthorized' };
  }

  const { data: oldBranch } = await supabase.from('branches').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('branches')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: 'Failed to archive branch' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'branches',
    entity_id: id,
    action: 'ARCHIVE',
    old_values: oldBranch,
    new_values: { ...oldBranch, is_active: false }
  }]);

  revalidatePath('/dashboard/branches');
  return { success: true };
}

export async function getAllBranches() {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) return [];
  return data;
}

