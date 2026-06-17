'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { verifyCurrentPassword } from '@/app/actions/auth';
import { revalidatePath } from 'next/cache';

// ─── Types ───────────────────────────────────────────────────────────

export type PaymentStatus = 'not_requested' | 'requested' | 'approved' | 'rejected' | 'paid';

export interface EmployeePaymentItem {
  id: string;            // assignment id (used for requesting payment)
  paymentId: string | null;
  date: string;
  branch: string;
  shiftType: string;
  attendance: string;
  amount: number;
  paymentRate: number;
  status: PaymentStatus | 'absent' | 'not_marked';
  paymentDate: string | null;
  requestedAt: string | null;
  remarks: string | null;
}

export interface EmployeePaymentSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalShifts: number;
}

export interface AdminPaymentRequest {
  paymentId: string;
  assignmentId: string;
  employeeName: string;
  date: string;
  branch: string;
  shiftType: string;
  attendance: string;
  amount: number;
  paymentRate: number;
  status: PaymentStatus;
  requestedAt: string | null;
  requestedRemarks: string | null;
  paymentDate: string | null;
  remarks: string | null;
  createdAt: string;
  canEdit: boolean;
  editTimeRemaining: string | null;
}

export interface AdminPaymentSummary {
  totalRequested: number;
  totalApproved: number;
  totalPaid: number;
  pendingReviews: number;
  requestedCount: number;
  approvedCount: number;
  paidCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatShiftType(raw: string): string {
  if (!raw) return 'N/A';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getEditTimeInfo(createdAt: string): { canEdit: boolean; remaining: string | null } {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  if (diffMs > oneWeekMs) {
    return { canEdit: false, remaining: null };
  }

  const remainingMs = oneWeekMs - diffMs;
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { canEdit: true, remaining: `${days}d ${hours}h remaining` };
}

async function cleanupExpiredPaymentRequests() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  await supabase
    .from('payments')
    .delete()
    .eq('payment_status', 'requested')
    .lt('requested_at', sevenDaysAgo.toISOString());
}

// ─── Employee: Get Payments ──────────────────────────────────────────

export async function getEmployeePayments(options?: {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}) {
  await cleanupExpiredPaymentRequests();
  
  const session = await getSession();
  if (!session) {
    return { data: [] as EmployeePaymentItem[], total: 0, summary: { totalEarned: 0, totalPaid: 0, totalPending: 0, totalShifts: 0 } as EmployeePaymentSummary };
  }

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 15;
  const statusFilter = options?.status;

  // Fetch assignments for this employee
  let query = supabase
    .from('assignments')
    .select(`
      id,
      payment_snapshot,
      assignment_status,
      shift_schedules!inner (shift_date, shift_type, branches (name)),
      attendance (attendance_status),
      payments (id, amount, payment_status, payment_date, requested_at, requested_remarks, remarks, created_at)
    `)
    .eq('employee_id', session.userId)
    .in('assignment_status', ['assigned', 'completed'])
    .order('created_at', { ascending: false });

  // Apply date filters on shift_schedules
  if (options?.dateFrom) {
    query = query.gte('shift_schedules.shift_date', options.dateFrom);
  }
  if (options?.dateTo) {
    query = query.lte('shift_schedules.shift_date', options.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching employee payments:', error);
    return { data: [] as EmployeePaymentItem[], total: 0, summary: { totalEarned: 0, totalPaid: 0, totalPending: 0, totalShifts: 0 } as EmployeePaymentSummary };
  }

  let allItems: EmployeePaymentItem[] = (data || []).map((a: any) => {
    const attStatus = a.attendance?.[0]?.attendance_status || 'not_marked';
    const isAbsent = attStatus === 'absent';
    const paymentRate = Number(a.payment_snapshot) || 0;
    const payment = a.payments?.[0];
    
    // Amount is the actual payment amount if exists, or the rate if not absent
    const amount = payment ? Number(payment.amount) : (isAbsent ? 0 : paymentRate);

    let status: EmployeePaymentItem['status'];
    if (isAbsent) {
      status = 'absent';
    } else if (!payment) {
      status = 'not_requested';
    } else {
      status = payment.payment_status as PaymentStatus;
    }

    return {
      id: a.id,
      paymentId: payment?.id || null,
      date: a.shift_schedules?.shift_date || '',
      branch: a.shift_schedules?.branches?.name || 'Unknown',
      shiftType: formatShiftType(a.shift_schedules?.shift_type || ''),
      attendance: attStatus || 'not_marked',
      amount,
      paymentRate,
      status,
      paymentDate: payment?.payment_date || null,
      requestedAt: payment?.requested_at || null,
      remarks: payment?.remarks || payment?.requested_remarks || null,
    };
  });

  // Apply status filter
  if (statusFilter && statusFilter !== 'all') {
    allItems = allItems.filter(i => i.status === statusFilter);
  }

  // Sort by date descending
  allItems.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Summary from ALL filtered items (before pagination)
  const summary: EmployeePaymentSummary = {
    totalEarned: allItems.filter(i => i.status !== 'absent').reduce((sum, i) => sum + i.amount, 0),
    totalPaid: allItems.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
    totalPending: allItems.filter(i => i.status === 'requested' || i.status === 'approved' || i.status === 'not_requested').reduce((sum, i) => sum + i.amount, 0),
    totalShifts: allItems.filter(i => i.status !== 'absent').length,
  };

  // Paginate
  const total = allItems.length;
  const from = (page - 1) * pageSize;
  const paginated = allItems.slice(from, from + pageSize);

  return { data: paginated, total, summary };
}

// ─── Employee: Request Payment ───────────────────────────────────────

export async function requestPayment(assignmentId: string, remarks?: string) {
  const session = await getSession();
  if (!session || session.role !== 'employee') {
    return { error: 'Unauthorized' };
  }

  // Verify assignment belongs to this employee
  const { data: assignment, error: assignError } = await supabase
    .from('assignments')
    .select(`
      id, employee_id, payment_snapshot, assignment_status,
      attendance (attendance_status),
      payments (id, payment_status)
    `)
    .eq('id', assignmentId)
    .single();

  if (assignError || !assignment) {
    return { error: 'Assignment not found' };
  }

  if (assignment.employee_id !== session.userId) {
    return { error: 'Unauthorized — you can only request payment for your own shifts' };
  }

  // Check attendance — must not be absent
  const attStatus = (assignment.attendance as any[])?.[0]?.attendance_status;
  if (attStatus === 'absent') {
    return { error: 'Payment cannot be requested for shifts where you were marked Absent' };
  }

  const existingPayment = (assignment.payments as any[])?.[0];

  if (existingPayment) {
    if (existingPayment.payment_status === 'paid') {
      return { error: 'This shift has already been paid' };
    }
    if (existingPayment.payment_status === 'requested') {
      return { error: 'Payment has already been requested for this shift' };
    }
    if (existingPayment.payment_status === 'approved') {
      return { error: 'Payment has already been approved for this shift' };
    }

    // Update to requested (handles not_requested and rejected statuses)
    const { error } = await supabase
      .from('payments')
      .update({
        payment_status: 'requested',
        requested_at: new Date().toISOString(),
        requested_remarks: remarks || null,
      })
      .eq('id', existingPayment.id);

    if (error) return { error: 'Failed to request payment' };

    // Audit log
    await supabase.from('audit_logs').insert([{
      user_id: session.userId,
      entity_type: 'payments',
      entity_id: existingPayment.id,
      action: 'PAYMENT_REQUESTED',
      old_values: { payment_status: existingPayment.payment_status },
      new_values: { payment_status: 'requested', requested_remarks: remarks || null },
    }]);
  } else {
    // Create new payment record
    const amount = Number(assignment.payment_snapshot) || 0;
    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert([{
        assignment_id: assignmentId,
        amount,
        payment_status: 'requested',
        requested_at: new Date().toISOString(),
        requested_remarks: remarks || null,
        created_by: session.userId,
      }])
      .select('id')
      .single();

    if (error) return { error: 'Failed to request payment' };

    // Audit log
    await supabase.from('audit_logs').insert([{
      user_id: session.userId,
      entity_type: 'payments',
      entity_id: newPayment?.id || assignmentId,
      action: 'PAYMENT_REQUESTED',
      new_values: { payment_status: 'requested', amount, requested_remarks: remarks || null },
    }]);
  }

  revalidatePath('/dashboard/payments');
  return { success: true };
}

// ─── Admin: Get Payment Requests ─────────────────────────────────────

export async function getAdminPaymentRequests(options?: {
  page?: number;
  historyPage?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  status?: string;
}) {
  await cleanupExpiredPaymentRequests();

  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { data: [] as AdminPaymentRequest[], historyData: [] as AdminPaymentRequest[], activeTotal: 0, historyTotal: 0, summary: { totalRequested: 0, totalApproved: 0, totalPaid: 0, pendingReviews: 0, requestedCount: 0, approvedCount: 0, paidCount: 0 } as AdminPaymentSummary };
  }

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 15;
  const search = (options?.search || '').toLowerCase();
  const statusFilter = options?.status;

  // Fetch all payments with joined data
  let query = supabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_status,
      payment_date,
      requested_at,
      requested_remarks,
      remarks,
      created_at,
      assignments!inner (
        id,
        payment_snapshot,
        assignment_status,
        employee_id,
        employees!inner (users!inner (full_name)),
        shift_schedules!inner (shift_date, shift_type, branch_id, branches!inner (name)),
        attendance (attendance_status)
      )
    `)
    .order('created_at', { ascending: false });

  // Apply date filters
  if (options?.dateFrom) {
    query = query.gte('assignments.shift_schedules.shift_date', options.dateFrom);
  }
  if (options?.dateTo) {
    query = query.lte('assignments.shift_schedules.shift_date', options.dateTo);
  }
  if (options?.branchId && options.branchId !== 'all') {
    query = query.eq('assignments.shift_schedules.branch_id', options.branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching admin payment requests:', error);
    return { data: [] as AdminPaymentRequest[], historyData: [] as AdminPaymentRequest[], activeTotal: 0, historyTotal: 0, summary: { totalRequested: 0, totalApproved: 0, totalPaid: 0, pendingReviews: 0, requestedCount: 0, approvedCount: 0, paidCount: 0 } as AdminPaymentSummary };
  }

  let allItems: AdminPaymentRequest[] = (data || []).map((p: any) => {
    const assignment = p.assignments;
    const attStatus = assignment?.attendance?.[0]?.attendance_status || 'not_marked';
    const editInfo = getEditTimeInfo(p.created_at);

    return {
      paymentId: p.id,
      assignmentId: assignment?.id || '',
      employeeName: assignment?.employees?.users?.full_name || 'Unknown',
      date: assignment?.shift_schedules?.shift_date || '',
      branch: assignment?.shift_schedules?.branches?.name || 'Unknown',
      shiftType: formatShiftType(assignment?.shift_schedules?.shift_type || ''),
      attendance: attStatus,
      amount: Number(p.amount) || 0,
      paymentRate: Number(assignment?.payment_snapshot) || 0,
      status: p.payment_status as PaymentStatus,
      requestedAt: p.requested_at || null,
      requestedRemarks: p.requested_remarks || null,
      paymentDate: p.payment_date || null,
      remarks: p.remarks || null,
      createdAt: p.created_at,
      canEdit: editInfo.canEdit,
      editTimeRemaining: editInfo.remaining,
    };
  });

  // Filter by search (employee name)
  if (search) {
    allItems = allItems.filter(i => i.employeeName.toLowerCase().includes(search));
  }

  // Filter by status
  if (statusFilter && statusFilter !== 'all') {
    allItems = allItems.filter(i => i.status === statusFilter);
  }

  // Sort by date descending, then by requested_at descending
  allItems.sort((a, b) => {
    const dateComp = (b.date || '').localeCompare(a.date || '');
    if (dateComp !== 0) return dateComp;
    return (b.requestedAt || b.createdAt || '').localeCompare(a.requestedAt || a.createdAt || '');
  });

  // Summary from ALL filtered items
  const summary: AdminPaymentSummary = {
    totalRequested: allItems.filter(i => i.status === 'requested').reduce((s, i) => s + i.amount, 0),
    totalApproved: allItems.filter(i => i.status === 'approved').reduce((s, i) => s + i.amount, 0),
    totalPaid: allItems.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
    pendingReviews: allItems.filter(i => i.status === 'requested').length,
    requestedCount: allItems.filter(i => i.status === 'requested').length,
    approvedCount: allItems.filter(i => i.status === 'approved').length,
    paidCount: allItems.filter(i => i.status === 'paid').length,
  };

  const activeItems = allItems.filter(i => i.status !== 'paid');
  const historyItems = allItems.filter(i => i.status === 'paid');

  const activeTotal = activeItems.length;
  const historyTotal = historyItems.length;

  const activeFrom = ((options?.page || 1) - 1) * pageSize;
  const activePaginated = activeItems.slice(activeFrom, activeFrom + pageSize);

  const historyFrom = ((options?.historyPage || 1) - 1) * pageSize;
  const historyPaginated = historyItems.slice(historyFrom, historyFrom + pageSize);

  return { data: activePaginated, historyData: historyPaginated, activeTotal, historyTotal, summary };
}

// ─── Admin: Get Payment Detail (for review modal) ────────────────────

export async function getPaymentDetail(paymentId: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_status,
      payment_date,
      requested_at,
      requested_remarks,
      remarks,
      created_at,
      assignments (
        id,
        payment_snapshot,
        employees (users (full_name)),
        shift_schedules (shift_date, shift_type, branches (name)),
        attendance (attendance_status)
      )
    `)
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    return { error: 'Payment not found' };
  }

  const assignment = payment.assignments as any;
  const editInfo = getEditTimeInfo(payment.created_at);

  // Get audit history for this payment
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('action, old_values, new_values, created_at, users(full_name)')
    .eq('entity_type', 'payments')
    .eq('entity_id', paymentId)
    .order('created_at', { ascending: true });

  return {
    paymentId: payment.id,
    employeeName: assignment?.employees?.users?.full_name || 'Unknown',
    date: assignment?.shift_schedules?.shift_date || '',
    branch: assignment?.shift_schedules?.branches?.name || 'Unknown',
    shiftType: formatShiftType(assignment?.shift_schedules?.shift_type || ''),
    attendance: assignment?.attendance?.[0]?.attendance_status || 'not_marked',
    amount: Number(payment.amount) || 0,
    paymentRate: Number(assignment?.payment_snapshot) || 0,
    status: payment.payment_status as PaymentStatus,
    requestedAt: payment.requested_at,
    requestedRemarks: payment.requested_remarks,
    paymentDate: payment.payment_date,
    remarks: payment.remarks,
    createdAt: payment.created_at,
    canEdit: editInfo.canEdit,
    editTimeRemaining: editInfo.remaining,
    history: (auditLogs || []).map((log: any) => ({
      action: log.action,
      by: log.users?.full_name || 'System',
      at: log.created_at,
      oldValues: log.old_values,
      newValues: log.new_values,
    })),
  };
}

// ─── Admin: Approve Payment ──────────────────────────────────────────

export async function approvePayment(paymentId: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, payment_status')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Payment not found' };
  if (payment.payment_status !== 'requested') {
    return { error: `Cannot approve a payment with status "${payment.payment_status}"` };
  }

  const { error } = await supabase
    .from('payments')
    .update({ payment_status: 'approved', remarks: 'Approved by admin' })
    .eq('id', paymentId);

  if (error) return { error: 'Failed to approve payment' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'payments',
    entity_id: paymentId,
    action: 'PAYMENT_APPROVED',
    old_values: { payment_status: 'requested' },
    new_values: { payment_status: 'approved' },
  }]);

  revalidatePath('/dashboard/payments');
  return { success: true };
}

// ─── Admin: Reject Payment ──────────────────────────────────────────

export async function rejectPayment(paymentId: string, reason?: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, payment_status')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Payment not found' };
  if (payment.payment_status !== 'requested') {
    return { error: `Cannot reject a payment with status "${payment.payment_status}"` };
  }

  const { error } = await supabase
    .from('payments')
    .update({
      payment_status: 'rejected',
      remarks: reason || 'Rejected by admin',
    })
    .eq('id', paymentId);

  if (error) return { error: 'Failed to reject payment' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'payments',
    entity_id: paymentId,
    action: 'PAYMENT_REJECTED',
    old_values: { payment_status: 'requested' },
    new_values: { payment_status: 'rejected', reason: reason || null },
  }]);

  revalidatePath('/dashboard/payments');
  return { success: true };
}

// ─── Admin: Mark Payment Paid ────────────────────────────────────────

export async function markPaymentPaid(paymentId: string, paymentDate: string, remarks?: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, payment_status')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Payment not found' };
  if (payment.payment_status === 'paid') {
    return { error: 'Payment is already marked as paid' };
  }

  const { error } = await supabase
    .from('payments')
    .update({
      payment_status: 'paid',
      payment_date: paymentDate,
      remarks: remarks || 'Marked paid by admin',
    })
    .eq('id', paymentId);

  if (error) return { error: 'Failed to mark payment as paid' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'payments',
    entity_id: paymentId,
    action: 'PAYMENT_MARKED_PAID',
    old_values: { payment_status: payment.payment_status },
    new_values: { payment_status: 'paid', payment_date: paymentDate, remarks },
  }]);

  revalidatePath('/dashboard/payments');
  return { success: true };
}

// ─── Admin: Update Payment ──────────────────────────────────────────

export async function updatePayment(paymentId: string, amount: number, remarks?: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return { error: 'Unauthorized' };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Payment not found' };

  // 6-hour edit window check
  const editInfo = getEditTimeInfo(payment.created_at);
  if (!editInfo.canEdit) {
    return { error: 'Edit window expired — payments can only be edited within 6 hours of creation' };
  }

  const oldAmount = payment.amount;
  const { error } = await supabase
    .from('payments')
    .update({ amount, remarks: remarks || payment.remarks })
    .eq('id', paymentId);

  if (error) return { error: 'Failed to update payment' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'payments',
    entity_id: paymentId,
    action: 'PAYMENT_UPDATED',
    old_values: { amount: oldAmount, remarks: payment.remarks },
    new_values: { amount, remarks },
  }]);

  revalidatePath('/dashboard/payments');
  return { success: true };
}

// ─── Admin: Delete Payment ──────────────────────────────────────────

export async function deletePayment(paymentId: string, password?: string) {
  const session = await getSession();
  if (!session || session.role === 'employee' || !session.email) {
    return { error: 'Unauthorized' };
  }

  if (!password) {
    return { error: 'Password is required to delete a payment' };
  }

  const verifyRes = await verifyCurrentPassword(password);
  if (verifyRes.error) {
    return { error: 'Incorrect password. Deletion denied.' };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Payment not found' };

  // Comment out the 6-hour edit window check since we use password now
  // const editInfo = getEditTimeInfo(payment.created_at);
  // if (!editInfo.canEdit) {
  //   return { error: 'Edit window expired — payments can only be deleted within 6 hours of creation' };
  // }

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId);

  if (error) return { error: 'Failed to delete payment' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'payments',
    entity_id: paymentId,
    action: 'PAYMENT_DELETED',
    old_values: payment,
  }]);

  revalidatePath('/dashboard/payments');
  return { success: true };
}

// ─── Employee: Request Missing Shift ───────────────────────────────

export async function requestMissingShift(branchId: string, shiftDate: string, shiftType: string, remarks?: string) {
  const session = await getSession();
  if (!session || session.role !== 'employee') {
    return { error: 'Unauthorized. Only employees can request missing shifts.' };
  }

  // 1. Get employee ID
  const { data: empData, error: empErr } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .single();

  if (empErr || !empData) return { error: 'Employee profile not found.' };

  // 2. Find or create schedule
  let scheduleId;
  const { data: schedule } = await supabase
    .from('shift_schedules')
    .select('id')
    .eq('branch_id', branchId)
    .eq('shift_date', shiftDate)
    .eq('shift_type', shiftType)
    .single();

  if (schedule) {
    scheduleId = schedule.id;
  } else {
    const { data: newSchedule, error: newErr } = await supabase
      .from('shift_schedules')
      .insert({
        branch_id: branchId,
        shift_date: shiftDate,
        shift_type: shiftType,
        required_staff_count: 1,
        created_by: session.userId
      })
      .select('id')
      .single();
    if (newErr) return { error: 'Failed to create shift schedule.' };
    scheduleId = newSchedule.id;
  }

  // 3. Find or create assignment
  let assignmentId;
  let paymentSnapshot = 0;
  
  const { data: existingAssignment } = await supabase
    .from('assignments')
    .select('id, payment_snapshot')
    .eq('shift_schedule_id', scheduleId)
    .eq('employee_id', empData.id)
    .single();

  if (existingAssignment) {
    assignmentId = existingAssignment.id;
    paymentSnapshot = Number(existingAssignment.payment_snapshot) || 0;
  } else {
    // Get Payment Rate
    const { data: rates } = await supabase
      .from('branch_pay_rates')
      .select('rate, effective_to')
      .eq('branch_id', branchId)
      .eq('shift_type', shiftType)
      .lte('effective_from', shiftDate)
      .order('effective_from', { ascending: false });

    const activeRateData = rates?.find(r => !r.effective_to || r.effective_to >= shiftDate);
    paymentSnapshot = activeRateData ? Number(activeRateData.rate) : 0;

    const { data: newAssignment, error: assignErr } = await supabase
      .from('assignments')
      .insert({
        shift_schedule_id: scheduleId,
        employee_id: empData.id,
        assignment_status: 'completed', // Marked as completed since they worked it
        payment_snapshot: paymentSnapshot,
        assigned_by: session.userId
      })
      .select('id')
      .single();
    
    if (assignErr) return { error: 'Failed to create shift assignment.' };
    assignmentId = newAssignment.id;
  }

  // 4. Ensure attendance is marked 'present'
  const { data: existingAttendance } = await supabase
    .from('attendance')
    .select('id')
    .eq('assignment_id', assignmentId)
    .single();

  if (!existingAttendance) {
    await supabase
      .from('attendance')
      .insert({
        assignment_id: assignmentId,
        attendance_status: 'present',
        remarks: 'Automatically marked via Missing Shift Request',
        marked_by: session.userId
      });
  }

  // 5. Check for existing payment
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, payment_status')
    .eq('assignment_id', assignmentId)
    .single();

  if (existingPayment) {
    if (['requested', 'approved', 'paid'].includes(existingPayment.payment_status)) {
      return { error: `Payment is already ${existingPayment.payment_status} for this shift.` };
    }
    // Update existing payment to requested
    const { error: updateErr } = await supabase
      .from('payments')
      .update({
        payment_status: 'requested',
        requested_at: new Date().toISOString(),
        requested_remarks: remarks || null
      })
      .eq('id', existingPayment.id);
      
    if (updateErr) return { error: 'Failed to request payment.' };
  } else {
    // Create new payment record
    const { error: insertErr } = await supabase
      .from('payments')
      .insert({
        assignment_id: assignmentId,
        amount: paymentSnapshot,
        payment_status: 'requested',
        requested_at: new Date().toISOString(),
        requested_remarks: remarks || null,
        created_by: session.userId
      });

    if (insertErr) return { error: 'Failed to create payment request.' };
  }

  revalidatePath('/dashboard/payments');
  return { success: true };
}
