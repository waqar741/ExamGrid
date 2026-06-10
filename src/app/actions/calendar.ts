'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function getCalendarEvents(year: number, month: number, branchId?: string) {
  const session = await getSession();
  if (!session) return [];

  // Create start and end date strings for the given month
  // month is 1-indexed (1 = Jan, 12 = Dec)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  
  // To get the last day of the month, we can go to the 0th day of the next month
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthDate = new Date(nextMonthYear, nextMonth - 1, 0); // 0th day of next month is last day of current month
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(nextMonthDate.getDate()).padStart(2, '0')}`;

  let selectQuery = `
    id,
    event_date,
    required_staff_count,
    branches (id, name),
    assignments (
      id,
      employee_id,
      assignment_status,
      attendance (attendance_status),
      payments (payment_status)
    )
  `;

  if (session.role === 'employee') {
    selectQuery = `
      id,
      event_date,
      required_staff_count,
      branches (id, name),
      assignments!inner (
        id,
        employee_id,
        assignment_status,
        attendance (attendance_status),
        payments (payment_status)
      )
    `;
  }

  let query = supabase
    .from('events')
    .select(selectQuery)
    .eq('is_active', true)
    .gte('event_date', startDate)
    .lte('event_date', endDate);

  if (session.role === 'employee') {
    query = query.eq('assignments.employee_id', session.userId);
  }

  if (branchId && branchId !== 'all') {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }

  return data;
}
