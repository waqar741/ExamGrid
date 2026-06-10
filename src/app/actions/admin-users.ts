'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getAdmins() {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') return [];

  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      roles!inner(name)
    `)
    .in('roles.name', ['admin', 'super_admin'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admins:', error);
    return [];
  }

  const admins = (data || []).map((user: any) => {
    const roleName = user.roles?.name || 'admin';
    return {
      ...user,
      role: roleName,
    };
  });

  return admins;
}

export async function createAdmin(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') return { error: 'Unauthorized' };

  const email = formData.get('email') as string;
  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;
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
