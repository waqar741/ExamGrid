'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function getReportMetrics(startDate?: string, endDate?: string, branchId?: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') return null;

  // 1. Total Paid vs Pending Payments
  let paymentsQuery = supabase.from('payments').select('amount, payment_status, assignments!inner(shift_schedules!inner(branch_id, shift_date))');
  
  if (branchId && branchId !== 'all') {
    paymentsQuery = paymentsQuery.eq('assignments.shift_schedules.branch_id', branchId);
  }
  if (startDate) {
    paymentsQuery = paymentsQuery.gte('assignments.shift_schedules.shift_date', startDate);
  }
  if (endDate) {
    paymentsQuery = paymentsQuery.lte('assignments.shift_schedules.shift_date', endDate);
  }

  const { data: payments } = await paymentsQuery;
  
  let totalPaid = 0;
  let totalPending = 0;
  
  payments?.forEach(p => {
    if (p.payment_status === 'paid') totalPaid += p.amount;
    if (p.payment_status === 'pending') totalPending += p.amount;
  });

  // 2. Attendance Rates
  let attQuery = supabase.from('attendance').select('attendance_status, assignments!inner(shift_schedules!inner(branch_id, shift_date))');
  
  if (branchId && branchId !== 'all') {
    attQuery = attQuery.eq('assignments.shift_schedules.branch_id', branchId);
  }
  if (startDate) {
    attQuery = attQuery.gte('assignments.shift_schedules.shift_date', startDate);
  }
  if (endDate) {
    attQuery = attQuery.lte('assignments.shift_schedules.shift_date', endDate);
  }

  const { data: attendance } = await attQuery;
  const totalAtt = attendance?.length || 0;
  const presentAtt = attendance?.filter(a => a.attendance_status === 'present' || a.attendance_status === 'late').length || 0;
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

  // 3. Total Branches & Active Employees
  const { count: branchesCount } = await supabase.from('branches').select('id', { count: 'exact' });
  const { count: employeesCount } = await supabase.from('employees').select('id', { count: 'exact' }).eq('is_active', true);

  return {
    totalPaid,
    totalPending,
    attendanceRate,
    branchesCount: branchesCount || 0,
    employeesCount: employeesCount || 0
  };
}

export async function getReportData(
  reportType: string,
  startDate?: string,
  endDate?: string,
  branchId?: string,
  search?: string
) {
  const session = await getSession();
  if (!session || session.role === 'employee') return [];

  // Helper filters
  const dateFilter = (dateStr?: string) => {
    if (!dateStr) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  const branchFilter = (bId?: string) => {
    if (!branchId || branchId === 'all') return true;
    return bId === branchId;
  };

  const searchFilter = (text?: string) => {
    if (!search || !text) return true;
    return text.toLowerCase().includes(search.toLowerCase());
  };

  switch (reportType) {
    case 'shift-report': {
      // Columns: Date, Branch, Shift, Required Staff, Assigned Staff, Attendance %, Pending Payments
      const { data: shifts, error } = await supabase.from('shift_schedules').select(`
        id, shift_date, shift_type, required_staff_count, branch_id, branches(name),
        assignments(id, assignment_status, attendance(attendance_status), payments(amount, payment_status))
      `).eq('is_active', true) as any;

      if (error || !shifts) return [];

      return shifts.map((shift: any) => {
        const branchName = shift.branches?.name || 'N/A';
        const activeAssignments = shift.assignments?.filter((a: any) => a.assignment_status === 'assigned' || a.assignment_status === 'completed') || [];
        const assignedStaff = activeAssignments.length;
        
        let attended = 0;
        let pendingPayments = 0;
        
        activeAssignments.forEach((a: any) => {
          if (a.attendance?.some((att: any) => att.attendance_status === 'present' || att.attendance_status === 'late')) {
            attended++;
          }
          a.payments?.forEach((p: any) => {
            if (p.payment_status === 'pending') {
              pendingPayments += Number(p.amount) || 0;
            }
          });
        });

        const attendanceRate = assignedStaff > 0 ? Math.round((attended / assignedStaff) * 100) : 0;

        return {
          date: shift.shift_date,
          branch: branchName,
          shift: shift.shift_type,
          requiredStaff: shift.required_staff_count,
          assignedStaff,
          attendanceRate: `${attendanceRate}%`,
          pendingPayments,
          branchId: shift.branch_id
        };
      }).filter((s: any) => dateFilter(s.date) && branchFilter(s.branchId) && (searchFilter(s.branch) || searchFilter(s.date) || searchFilter(s.shift)));
    }

    case 'employee-report': {
      // Columns: Employee, Morning Shifts, Afternoon Shifts, Full Day Shifts, Total Earnings, Pending Earnings
      const { data: employees, error } = await supabase.from('employees').select(`
        id, users(full_name),
        assignments (
          id, assignment_status, payment_snapshot,
          shift_schedules(shift_date, branch_id, shift_type),
          payments(amount, payment_status)
        )
      `).eq('is_active', true) as any;

      if (error || !employees) return [];

      return employees.map((emp: any) => {
        const name = emp.users?.full_name || 'N/A';
        let morningShifts = 0;
        let afternoonShifts = 0;
        let fullDayShifts = 0;
        let totalEarnings = 0;
        let pendingEarnings = 0;

        emp.assignments?.forEach((a: any) => {
          if (a.assignment_status === 'removed' || a.assignment_status === 'replaced') return;
          if (!dateFilter(a.shift_schedules?.shift_date)) return;
          if (!branchFilter(a.shift_schedules?.branch_id)) return;

          const shiftType = a.shift_schedules?.shift_type || '';
          if (shiftType === 'MORNING') morningShifts++;
          else if (shiftType === 'AFTERNOON') afternoonShifts++;
          else if (shiftType === 'FULL_DAY') fullDayShifts++;

          a.payments?.forEach((p: any) => {
            const amt = Number(p.amount) || 0;
            if (p.payment_status === 'paid') totalEarnings += amt;
            if (p.payment_status === 'pending') pendingEarnings += amt;
          });
        });

        return {
          employee: name,
          morningShifts,
          afternoonShifts,
          fullDayShifts,
          totalEarnings: totalEarnings + pendingEarnings, // Earned so far
          pendingEarnings
        };
      }).filter((emp: any) => searchFilter(emp.employee));
    }

    case 'branch-report': {
      // Columns: Branch, Total Shifts, Total Assignments, Attendance Rate, Paid Amount, Pending Amount
      const { data: branches, error } = await supabase.from('branches').select(`
        id, name,
        shift_schedules (
          id, shift_date,
          assignments (
            id, assignment_status,
            attendance(attendance_status),
            payments (amount, payment_status)
          )
        )
      `).eq('is_active', true) as any;

      if (error || !branches) return [];

      return branches.map((b: any) => {
        let totalShifts = 0;
        let totalAssignments = 0;
        let paidAmount = 0;
        let pendingAmount = 0;
        let present = 0;
        let totalAtt = 0;

        b.shift_schedules?.forEach((ev: any) => {
          if (!dateFilter(ev.shift_date)) return;
          totalShifts++;

          ev.assignments?.forEach((a: any) => {
            if (a.assignment_status === 'removed' || a.assignment_status === 'replaced') return;
            totalAssignments++;
            
            a.attendance?.forEach((att: any) => {
              totalAtt++;
              if (att.attendance_status === 'present' || att.attendance_status === 'late') present++;
            });

            a.payments?.forEach((p: any) => {
              const amt = Number(p.amount) || 0;
              if (p.payment_status === 'paid') paidAmount += amt;
              else if (p.payment_status === 'pending') pendingAmount += amt;
            });
          });
        });

        const attendanceRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 0;

        return {
          branch: b.name,
          totalShifts,
          totalAssignments,
          attendanceRate: `${attendanceRate}%`,
          paidAmount,
          pendingAmount
        };
      }).filter((b: any) => branchFilter(b.branch) && searchFilter(b.branch));
    }

    case 'payment-report': {
      // Columns: Employee, Branch, Shift, Amount, Status, Date
      const { data: payments, error } = await supabase.from('payments').select(`
        id, amount, payment_status,
        assignments (
          employee_id,
          employees (users (full_name)),
          shift_schedules (shift_date, shift_type, branch_id, branches (name))
        )
      `) as any;

      if (error || !payments) return [];

      return payments.map((p: any) => ({
        employee: p.assignments?.employees?.users?.full_name || 'N/A',
        branch: p.assignments?.shift_schedules?.branches?.name || 'N/A',
        branchId: p.assignments?.shift_schedules?.branch_id,
        shift: p.assignments?.shift_schedules?.shift_type || 'N/A',
        amount: p.amount,
        status: p.payment_status,
        date: p.assignments?.shift_schedules?.shift_date || 'N/A'
      })).filter((p: any) => 
        dateFilter(p.date) && 
        branchFilter(p.branchId) && 
        (searchFilter(p.employee) || searchFilter(p.branch) || searchFilter(p.shift))
      );
    }

    default:
      return [];
  }
}

export async function logReportExport(reportName: string, format: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  await supabase.from('audit_logs').insert([{
    user_id: session.userId,
    entity_type: 'reports',
    entity_id: session.userId,
    action: `EXPORT_${format.toUpperCase()}`,
    new_values: { report_name: reportName, format, timestamp: new Date().toISOString() }
  }]);

  return { success: true };
}
