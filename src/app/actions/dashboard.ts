'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function getDashboardMetrics() {
  const session = await getSession();
  if (!session) return null;

  const today = new Date().toISOString().split('T')[0];
  const isEmployee = session.role === 'employee';

  if (isEmployee) {
    // 1. Shifts Today (assigned to employee)
    const { data: empEventsToday } = await supabase
      .from('shift_schedules')
      .select('id, assignments!inner(employee_id)')
      .eq('shift_date', today)
      .eq('is_active', true)
      .eq('assignments.employee_id', session.userId);

    // 2. Assigned Staff Today
    const { data: assignmentsToday } = await supabase
      .from('assignments')
      .select('id, shift_schedules!inner(shift_date)')
      .eq('shift_schedules.shift_date', today)
      .eq('employee_id', session.userId)
      .in('assignment_status', ['assigned', 'completed']);

    // 3. Pending Payments
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('amount, assignments!inner(employee_id)')
      .eq('payment_status', 'pending')
      .eq('assignments.employee_id', session.userId);

    const totalPendingPayments = pendingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // 4. Staff Shortages: hidden for employees
    const staffShortages = 0;

    // 5. Upcoming Shifts
    const { data: upcomingEvents } = await supabase
      .from('shift_schedules')
      .select(`
        id, 
        shift_date, 
        shift_type,
        required_staff_count, 
        branches(name),
        assignments!inner(id, employee_id, assignment_status)
      `)
      .gte('shift_date', today)
      .eq('is_active', true)
      .eq('assignments.employee_id', session.userId)
      .in('assignments.assignment_status', ['assigned', 'pending'])
      .order('shift_date', { ascending: true })
      .limit(5);

    // 6. Recent Activity
    const { data: recentActivity } = await supabase
      .from('assignment_history')
      .select(`
        id,
        action_type,
        created_at,
        employees!assignment_history_new_employee_id_fkey(users(full_name)),
        users(full_name)
      `)
      .or(`new_employee_id.eq.${session.userId},old_employee_id.eq.${session.userId}`)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      eventsToday: empEventsToday?.length || 0,
      assignedStaff: assignmentsToday?.length || 0,
      pendingPayments: totalPendingPayments,
      staffShortages,
      upcomingEvents: upcomingEvents || [],
      recentActivity: recentActivity || []
    };
  }

  // 1. Shifts Today (Admin)
  const { count: eventsToday } = await supabase
    .from('shift_schedules')
    .select('id', { count: 'exact' })
    .eq('shift_date', today)
    .eq('is_active', true);

  // 2. Assigned Staff Today (Admin)
  const { data: assignmentsToday } = await supabase
    .from('assignments')
    .select('id, shift_schedules!inner(shift_date)')
    .eq('shift_schedules.shift_date', today)
    .in('assignment_status', ['assigned', 'completed']);

  // 3. Pending Payments (Admin)
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('payment_status', 'pending');
  
  const totalPendingPayments = pendingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // 4. Staff Shortages (Admin)
  const { data: upcomingEvents } = await supabase
    .from('shift_schedules')
    .select(`
      id, 
      shift_date, 
      shift_type,
      required_staff_count, 
      branches(name),
      assignments(id)
    `)
    .gte('shift_date', today)
    .eq('is_active', true)
    .order('shift_date', { ascending: true })
    .limit(5);

  let staffShortages = 0;
  upcomingEvents?.forEach(ev => {
    const activeAssignments = ev.assignments?.length || 0;
    if (activeAssignments < ev.required_staff_count) {
      staffShortages += (ev.required_staff_count - activeAssignments);
    }
  });

  // 5. Recent Activity (Admin)
  const { data: recentActivity } = await supabase
    .from('assignment_history')
    .select(`
      id,
      action_type,
      created_at,
      employees!assignment_history_new_employee_id_fkey(users(full_name)),
      users(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    eventsToday: eventsToday || 0,
    assignedStaff: assignmentsToday?.length || 0,
    pendingPayments: totalPendingPayments,
    staffShortages,
    upcomingEvents: upcomingEvents || [],
    recentActivity: recentActivity || []
  };
}
