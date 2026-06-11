'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getEmployees(options?: {
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
    .from('employees')
    .select('*, users(full_name, email)', { count: 'exact' })
    .eq('is_active', true);

  if (search) {
    const { data: matchedUsers } = await supabase
      .from('users')
      .select('id')
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const matchedUserIds = (matchedUsers || []).map((u: any) => u.id);

    let orCondition = `employee_code.ilike.%${search}%,phone.ilike.%${search}%`;
    if (matchedUserIds.length > 0) {
      orCondition += `,user_id.in.(${matchedUserIds.join(',')})`;
    }
    queryBuilder = queryBuilder.or(orCondition);
  }

  if (sortBy === 'full_name' || sortBy === 'email') {
    queryBuilder = queryBuilder.order('created_at', { ascending: sortOrder === 'asc' });
  } else {
    queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching employees:', error);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function getEmployeeById(id: string) {
  const session = await getSession();
  if (!session || (session.role === 'employee' && id !== session.userId)) return null;

  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      users (full_name, email),
      assignments (
        id, assignment_status, 
        shift_schedules (
          shift_date,
          branches (name),
          shift_templates (name)
        ),
        attendance (attendance_status),
        payments (payment_status, amount)
      )
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createEmployee(formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const email = formData.get('email') as string;
  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;
  const employeeCode = formData.get('employee_code') as string;
  const password = formData.get('password') as string || 'password123';

  if (!email || !fullName || !employeeCode || !phone) {
    return { error: 'Email, Full Name, Employee Code, and Phone are required' };
  }

  // Get employee role ID
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'employee')
    .single();

  if (roleError || !roleData) {
    return { error: 'Employee role not found' };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user record (no phone or role in users table)
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
    return { error: 'Failed to create user record' };
  }

  // Create employee profile (contains user_id, employee_code, phone)
  const { error: empError } = await supabase
    .from('employees')
    .insert([{
      id: newUser.id,
      user_id: newUser.id,
      employee_code: employeeCode,
      phone,
      status: 'active',
      is_active: true
    }]);

  if (empError) {
    console.error(empError);
    return { error: 'Failed to create employee profile' };
  }

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'employees',
    entity_id: newUser.id,
    action: 'CREATE',
    new_values: { email, full_name: fullName, employee_code: employeeCode, phone }
  }]);

  revalidatePath('/dashboard/employees');
  return { success: true };
}

export async function updateEmployee(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const employeeCode = formData.get('employee_code') as string;
  const password = formData.get('password') as string;
  const status = formData.get('status') as string;

  if (!fullName || !email || !employeeCode) return { error: 'Name, Email, and Code are required' };

  const { data: oldUser } = await supabase.from('users').select('*').eq('id', id).single();
  const { data: oldEmp } = await supabase.from('employees').select('*').eq('id', id).single();

  let userUpdate: any = { full_name: fullName, email, updated_at: new Date().toISOString() };
  if (password) {
    userUpdate.password_hash = await bcrypt.hash(password, 10);
  }

  const { error: userError } = await supabase
    .from('users')
    .update(userUpdate)
    .eq('id', id);

  if (userError) return { error: 'Failed to update user record' };

  const { error: empError } = await supabase
    .from('employees')
    .update({ status, phone, employee_code: employeeCode })
    .eq('id', id);

  if (empError) return { error: 'Failed to update employee profile' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'employees',
    entity_id: id,
    action: 'UPDATE',
    old_values: { ...oldUser, ...oldEmp },
    new_values: { ...oldUser, ...oldEmp, ...userUpdate, phone, status, employee_code: employeeCode }
  }]);

  revalidatePath('/dashboard/employees');
  return { success: true };
}

export async function archiveEmployee(id: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: oldEmp } = await supabase.from('employees').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('employees')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: 'Failed to archive employee' };

  // Also disable user login theoretically
  await supabase.from('users').update({ is_active: false }).eq('id', id);

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'employees',
    entity_id: id,
    action: 'ARCHIVE',
    old_values: oldEmp,
    new_values: { ...oldEmp, is_active: false }
  }]);

  revalidatePath('/dashboard/employees');
  return { success: true };
}

export async function getAllEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      users (full_name, email)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}

