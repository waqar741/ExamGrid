'use server';

import { supabase } from '@/lib/supabase';
import { encrypt, getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

export async function login(formData: FormData) {
  const emailRaw = formData.get('email') as string;
  const email = emailRaw ? emailRaw.trim().toLowerCase() : '';
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // Check if it's an employee code (no @ symbol)
  let searchEmail = email;
  if (!email.includes('@')) {
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('users(email)')
      .eq('employee_code', emailRaw.trim())
      .single();

    if (empData && empData.users && empData.users.email) {
      searchEmail = empData.users.email.toLowerCase();
    }
  }

  // Fetch user from public.users
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, password_hash, role_id, full_name, is_active, roles(name)')
    .eq('email', searchEmail)
    .single();

  if (error || !user) {
    return { error: 'Invalid email or password' };
  }

  if (!user.is_active) {
    return { error: 'Account is deactivated' };
  }

  // Compare passwords
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    return { error: 'Invalid email or password' };
  }

  // Update last login
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  // Create session
  const roleName = (Array.isArray(user.roles) ? user.roles[0]?.name : (user.roles as any)?.name) || 'employee';
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const sessionData = {
    userId: user.id,
    role: roleName,
    email: user.email,
  };

  const session = await encrypt(sessionData);
  
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    expires,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/login');
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select(`
      *,
      roles (name)
    `)
    .eq('id', session.userId)
    .single();

  if (error || !user) return null;

  let employee = null;
  if (user.roles?.name === 'employee') {
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .single();
    employee = empData;
  }

  return {
    ...user,
    role: user.roles?.name || 'employee',
    phone: employee?.phone || '',
    employee_code: employee?.employee_code || '',
  };
}

export async function updateUserProfile(fullName: string, phone: string, email: string) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  if (!fullName || !email) return { error: 'Name and Email are required' };

  const { error: userError } = await supabase
    .from('users')
    .update({ full_name: fullName, email, updated_at: new Date().toISOString() })
    .eq('id', session.userId);

  if (userError) {
    console.error('Error updating profile:', userError);
    return { error: 'Failed to update profile. Email might be in use.' };
  }

  // Update employees table phone if role is employee
  if (session.role === 'employee') {
    const { error: empError } = await supabase
      .from('employees')
      .update({ phone })
      .eq('user_id', session.userId);

    if (empError) {
      console.error('Error updating employee phone:', empError);
      return { error: 'Failed to update phone number' };
    }
  }

  // Log in audit log
  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'users',
    entity_id: session.userId,
    action: 'UPDATE_PROFILE',
    new_values: { full_name: fullName, phone, email }
  }]);

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/profile');
  return { success: true };
}

export async function verifyCurrentPassword(password: string) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', session.userId)
    .single();

  if (fetchError || !user) return { error: 'User not found' };

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return { error: 'Incorrect password' };

  return { success: true };
}

export async function changeUserPassword(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All password fields are required' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match' };
  }

  // Fetch current password hash
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', session.userId)
    .single();

  if (fetchError || !user) {
    return { error: 'User not found' };
  }

  // Check current password
  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return { error: 'Incorrect current password' };
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
    .eq('id', session.userId);

  if (updateError) {
    return { error: 'Failed to update password' };
  }

  // Log audit
  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'users',
    entity_id: session.userId,
    action: 'CHANGE_PASSWORD',
    new_values: { password_changed: true }
  }]);

  return { success: true };
}

export async function getAccountData() {
  const session = await getSession();
  if (!session) return null;

  // Get user data
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      *,
      roles (name)
    `)
    .eq('id', session.userId)
    .single();

  if (error || !user) return null;

  // Get employee data if applicable
  let employee = null;
  if (user.roles?.name === 'employee') {
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .single();
    employee = empData;
  }

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.roles?.name || 'employee',
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      phone: employee?.phone || '',
      employee_code: employee?.employee_code || ''
    }
  };
}
