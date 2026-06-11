'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ─── Types ───────────────────────────────────────────────────────────

export interface BranchDateSettlement {
  shiftDate: string;
  branchId: string;
  branchName: string;
  assigned: number;
  present: number;
  absent: number;
  payable: number;
  totalAmount: number;
  paidAmount: number;
  status: 'pending' | 'partially_paid' | 'paid';
  shiftScheduleIds: string[];
}

export interface SettlementSummary {
  totalPending: number;
  totalPaid: number;
  pendingSettlements: number;
  paidSettlements: number;
}

// ─── Admin: Branch/Date Settlement List ──────────────────────────────

export async function getBranchDateSettlements(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  status?: string;
}) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { data: [], total: 0, summary: { totalPending: 0, totalPaid: 0, pendingSettlements: 0, paidSettlements: 0 } };
  }

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const search = (options?.search || '').toLowerCase();
  const dateFrom = options?.dateFrom;
  const dateTo = options?.dateTo;
  const branchId = options?.branchId;
  const statusFilter = options?.status;

  // Fetch all shift_schedules with their assignments, attendance, and payments
  let query = supabase
    .from('shift_schedules')
    .select(`
      id,
      shift_date,
      shift_type,
      branch_id,
      required_staff_count,
      branches!inner (id, name),
      assignments (
        id,
        employee_id,
        assignment_status,
        payment_snapshot,
        attendance (attendance_status),
        payments (id, amount, payment_status)
      )
    `)
    .eq('is_active', true)
    .order('shift_date', { ascending: false });

  if (dateFrom) query = query.gte('shift_date', dateFrom);
  if (dateTo) query = query.lte('shift_date', dateTo);
  if (branchId && branchId !== 'all') query = query.eq('branch_id', branchId);

  const { data: schedules, error } = await query;

  if (error) {
    console.error('Error fetching settlements:', error);
    return { data: [], total: 0, summary: { totalPending: 0, totalPaid: 0, pendingSettlements: 0, paidSettlements: 0 } };
  }

  // Group by (shift_date, branch_id)
  const groupMap = new Map<string, BranchDateSettlement>();

  for (const schedule of (schedules || [])) {
    const branch = schedule.branches as any;
    const key = `${schedule.shift_date}_${schedule.branch_id}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        shiftDate: schedule.shift_date,
        branchId: schedule.branch_id,
        branchName: branch?.name || 'Unknown',
        assigned: 0,
        present: 0,
        absent: 0,
        payable: 0,
        totalAmount: 0,
        paidAmount: 0,
        status: 'pending',
        shiftScheduleIds: []
      });
    }

    const group = groupMap.get(key)!;
    group.shiftScheduleIds.push(schedule.id);

    const assignments = (schedule.assignments || []) as any[];
    for (const assignment of assignments) {
      if (assignment.assignment_status === 'replaced' || assignment.assignment_status === 'removed' || assignment.assignment_status === 'pending') continue;

      group.assigned++;

      const attStatus = assignment.attendance?.[0]?.attendance_status;
      if (attStatus === 'present' || attStatus === 'late') {
        group.present++;
        const amount = Number(assignment.payment_snapshot) || 0;
        if (amount > 0) {
          group.payable++;
          group.totalAmount += amount;
        }
      } else if (attStatus === 'absent') {
        group.absent++;
      }

      // Check payment status
      const payment = assignment.payments?.[0];
      if (payment && payment.payment_status === 'paid') {
        group.paidAmount += Number(payment.amount) || 0;
      }
    }
  }

  // Calculate status for each group
  let allSettlements = Array.from(groupMap.values());
  for (const s of allSettlements) {
    if (s.payable === 0) {
      s.status = s.assigned > 0 ? 'pending' : 'pending';
    } else if (s.paidAmount >= s.totalAmount && s.totalAmount > 0) {
      s.status = 'paid';
    } else if (s.paidAmount > 0) {
      s.status = 'partially_paid';
    } else {
      s.status = 'pending';
    }
  }

  // Filter by search (branch name)
  if (search) {
    allSettlements = allSettlements.filter(s => s.branchName.toLowerCase().includes(search));
  }

  // Filter by status
  if (statusFilter && statusFilter !== 'all') {
    allSettlements = allSettlements.filter(s => s.status === statusFilter);
  }

  // Sort by date descending
  allSettlements.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));

  // Calculate summary from ALL filtered settlements (before pagination)
  const summary: SettlementSummary = {
    totalPending: allSettlements.filter(s => s.status !== 'paid').reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0),
    totalPaid: allSettlements.reduce((sum, s) => sum + s.paidAmount, 0),
    pendingSettlements: allSettlements.filter(s => s.status !== 'paid').length,
    paidSettlements: allSettlements.filter(s => s.status === 'paid').length,
  };

  // Paginate
  const total = allSettlements.length;
  const from = (page - 1) * pageSize;
  const paginated = allSettlements.slice(from, from + pageSize);

  return { data: paginated, total, summary };
}

// ─── Admin: Branch/Date Detail ───────────────────────────────────────

export async function getBranchDateDetail(branchId: string, shiftDate: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { employees: [], branchName: '', totalPayable: 0, totalPaid: 0 };
  }

  const { data: schedules, error } = await supabase
    .from('shift_schedules')
    .select(`
      id,
      shift_type,
      branches (name),
      assignments (
        id,
        employee_id,
        assignment_status,
        payment_snapshot,
        employees (users (full_name)),
        attendance (attendance_status),
        payments (id, amount, payment_status, payment_date)
      )
    `)
    .eq('branch_id', branchId)
    .eq('shift_date', shiftDate)
    .eq('is_active', true);

  if (error || !schedules) {
    console.error('Error fetching branch detail:', error);
    return { employees: [], branchName: '', totalPayable: 0, totalPaid: 0 };
  }

  const branchName = (schedules[0]?.branches as any)?.name || 'Unknown';
  const employees: any[] = [];
  let totalPayable = 0;
  let totalPaid = 0;

  for (const schedule of schedules) {
    const assignments = (schedule.assignments || []) as any[];
    for (const assignment of assignments) {
      if (assignment.assignment_status === 'replaced' || assignment.assignment_status === 'removed' || assignment.assignment_status === 'pending') continue;

      const attStatus = assignment.attendance?.[0]?.attendance_status || null;
      const isPresent = attStatus === 'present' || attStatus === 'late';
      const isAbsent = attStatus === 'absent';
      const amount = isPresent ? (Number(assignment.payment_snapshot) || 0) : 0;
      const payment = assignment.payments?.[0];
      const paymentStatus = isAbsent ? 'n/a' : (payment?.payment_status || 'pending');

      if (isPresent && amount > 0) totalPayable += amount;
      if (payment?.payment_status === 'paid') totalPaid += Number(payment.amount) || 0;

      employees.push({
        assignmentId: assignment.id,
        employeeName: assignment.employees?.users?.full_name || 'Unknown',
        shiftType: schedule.shift_type,
        attendance: attStatus || 'not_marked',
        amount,
        paymentStatus,
        paymentId: payment?.id || null,
      });
    }
  }

  // Sort: present first, then absent, then not marked
  const order: Record<string, number> = { present: 0, late: 1, absent: 2, not_marked: 3 };
  employees.sort((a, b) => (order[a.attendance] ?? 9) - (order[b.attendance] ?? 9));

  return { employees, branchName, totalPayable, totalPaid };
}

// ─── Admin: Mark Branch Paid (Bulk) ──────────────────────────────────

export async function markBranchPaid(branchId: string, shiftDate: string, paymentDate: string, remarks: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  // Get all assignments for this branch/date that are present/late and have pending payments
  const { data: schedules } = await supabase
    .from('shift_schedules')
    .select(`
      id,
      assignments (
        id,
        assignment_status,
        payment_snapshot,
        attendance (attendance_status),
        payments (id, payment_status)
      )
    `)
    .eq('branch_id', branchId)
    .eq('shift_date', shiftDate)
    .eq('is_active', true);

  if (!schedules) return { error: 'No schedules found' };

  let markedCount = 0;
  let totalAmount = 0;

  for (const schedule of schedules) {
    const assignments = (schedule.assignments || []) as any[];
    for (const assignment of assignments) {
      if (assignment.assignment_status === 'replaced' || assignment.assignment_status === 'removed' || assignment.assignment_status === 'pending') continue;

      const attStatus = assignment.attendance?.[0]?.attendance_status;
      if (attStatus !== 'present' && attStatus !== 'late') continue;

      const payment = assignment.payments?.[0];
      if (!payment || payment.payment_status === 'paid') continue;

      // Mark this payment as paid
      const { error } = await supabase
        .from('payments')
        .update({
          payment_status: 'paid',
          payment_date: paymentDate,
          remarks: remarks || 'Branch settlement',
        })
        .eq('id', payment.id);

      if (!error) {
        markedCount++;
        totalAmount += Number(assignment.payment_snapshot) || 0;
      }
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'payments',
    entity_id: branchId,
    action: 'BRANCH_SETTLEMENT',
    new_values: {
      branch_id: branchId,
      shift_date: shiftDate,
      payment_date: paymentDate,
      marked_count: markedCount,
      total_amount: totalAmount,
      remarks
    }
  }]);

  revalidatePath('/dashboard/payments');
  return { success: true, markedCount, totalAmount };
}

// ─── Admin: Mark Single Payment Paid ─────────────────────────────────

export async function markPaid(paymentId: string, paymentDate: string, remarks: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: oldPayment } = await supabase.from('payments').select('payment_status').eq('id', paymentId).single();

  const { error } = await supabase
    .from('payments')
    .update({
      payment_status: 'paid',
      payment_date: paymentDate,
      remarks: remarks || null
    })
    .eq('id', paymentId);

  if (error) {
    console.error('Error marking payment paid:', error);
    return { error: 'Failed to process payment' };
  }

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'payments',
    entity_id: paymentId,
    action: 'UPDATE',
    old_values: { payment_status: oldPayment?.payment_status || 'pending' },
    new_values: { payment_status: 'paid', payment_date: paymentDate, remarks }
  }]);

  revalidatePath('/dashboard/payments');
  return { success: true };
}

// ─── Employee: My Payments ───────────────────────────────────────────

export async function getMyPayments(options?: {
  page?: number;
  pageSize?: number;
}) {
  const session = await getSession();
  if (!session) return { data: [], total: 0, summary: { totalEarned: 0, totalPaid: 0, totalPending: 0, totalShifts: 0 } };

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;

  // Get assignments for this employee with payment data
  let query = supabase
    .from('assignments')
    .select(`
      id,
      payment_snapshot,
      assignment_status,
      shift_schedules (shift_date, shift_type, branches (name)),
      attendance (attendance_status),
      payments (id, amount, payment_status, payment_date)
    `, { count: 'exact' })
    .eq('employee_id', session.userId)
    .in('assignment_status', ['assigned', 'completed'])
    .order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching my payments:', error);
    return { data: [], total: 0, summary: { totalEarned: 0, totalPaid: 0, totalPending: 0, totalShifts: 0 } };
  }

  const allItems = (data || []).map((a: any) => {
    const attStatus = a.attendance?.[0]?.attendance_status;
    const isPresent = attStatus === 'present' || attStatus === 'late';
    const amount = isPresent ? (Number(a.payment_snapshot) || 0) : 0;
    const payment = a.payments?.[0];

    return {
      id: a.id,
      date: a.shift_schedules?.shift_date,
      branch: a.shift_schedules?.branches?.name || 'Unknown',
      shiftType: a.shift_schedules?.shift_type || 'N/A',
      attendance: attStatus || 'not_marked',
      amount,
      status: !isPresent ? (attStatus === 'absent' ? 'absent' : 'not_marked') : (payment?.payment_status || 'pending'),
    };
  });

  // Summary from ALL items (not paginated)
  const summary = {
    totalEarned: allItems.reduce((sum, i) => sum + i.amount, 0),
    totalPaid: allItems.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
    totalPending: allItems.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0),
    totalShifts: allItems.filter(i => i.attendance === 'present' || i.attendance === 'late').length,
  };

  // Paginate
  const from = (page - 1) * pageSize;
  const paginated = allItems.slice(from, from + pageSize);

  return { data: paginated, total: allItems.length, summary };
}
