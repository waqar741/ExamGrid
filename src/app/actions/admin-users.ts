'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getAdmins(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') return { data: [], total: 0 };

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const search = options?.search || '';

  let queryBuilder = supabase
    .from('users')
    .select(`
      *,
      roles!inner(name)
    `, { count: 'exact' })
    .in('roles.name', ['admin', 'super_admin'])
    .order('created_at', { ascending: false });

  if (search) {
    queryBuilder = queryBuilder.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching admins:', error);
    return { data: [], total: 0 };
  }

  const admins = (data || []).map((user: any) => {
    const roleName = user.roles?.name || 'admin';
    return {
      ...user,
      role: roleName,
    };
  });

  return { data: admins, total: count || 0 };
}

export async function createAdmin(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') return { error: 'Unauthorized' };

  const emailRaw = formData.get('email') as string;
  const email = emailRaw ? emailRaw.trim().toLowerCase() : '';
  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string || '';
  const password = formData.get('password') as string || 'password123';

  if (!email || !fullName) return { error: 'Email and Name are required' };

  // Get admin role ID
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'admin')
    .single();

  if (roleError || !roleData) {
    return { error: 'Admin role not found' };
  }

  // Hash temporary password
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert([{
      email,
      full_name: fullName,
      password_hash: hashedPassword,
      role_id: roleData.id,
      is_active: true
    }])
    .select('id')
    .single();

  if (userError || !newUser) {
    console.error(userError);
    return { error: 'Failed to create admin user' };
  }

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'users',
    entity_id: newUser.id,
    action: 'CREATE',
    new_values: { email, full_name: fullName, role: 'admin', phone }
  }]);

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function toggleAdminStatus(id: string, currentStatus: boolean) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') return { error: 'Unauthorized' };

  // Don't disable yourself
  if (id === session.userId) return { error: 'Cannot disable your own account' };

  const newStatus = !currentStatus;

  const { error } = await supabase
    .from('users')
    .update({ is_active: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: 'Failed to update user status' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'users',
    entity_id: id,
    action: newStatus ? 'RESTORE' : 'DISABLE',
    new_values: { is_active: newStatus }
  }]);

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function deleteAdmin(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') return { error: 'Unauthorized' };

  if (id === session.userId) return { error: 'Cannot delete your own account' };

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting admin:', error);
    return { error: 'Failed to delete administrator' };
  }

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'users',
    entity_id: id,
    action: 'DELETE',
    new_values: { deleted_user_id: id }
  }]);

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function editAdmin(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') return { error: 'Unauthorized' };

  const email = formData.get('email') as string;
  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;

  if (!email || !fullName) return { error: 'Email and Name are required' };

  // Get current user to log audit and prevent email dupes
  const { data: currentUser, error: currentUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (currentUserError || !currentUser) {
    return { error: 'Admin not found' };
  }

  const updates: any = {
    email,
    full_name: fullName,
    phone,
    updated_at: new Date().toISOString()
  };

  if (password) {
    updates.password_hash = await bcrypt.hash(password, 10);
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating admin:', error);
    return { error: 'Failed to update administrator details. Email might be in use.' };
  }

  const newValuesLog: any = { email, full_name: fullName, phone };
  if (password) newValuesLog.password = '[CHANGED]';

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'users',
    entity_id: id,
    action: 'UPDATE',
    old_values: { email: currentUser.email, full_name: currentUser.full_name, phone: currentUser.phone },
    new_values: newValuesLog
  }]);

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}
