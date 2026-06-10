'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function getReportMetrics(startDate?: string, endDate?: string, branchId?: string) {
  const session = await getSession();
  if (!session || session.role === 'employee') return null;

  // 1. Total Paid vs Pending Payments
  let paymentsQuery = supabase.from('payments').select('amount, payment_status, assignments!inner(events!inner(branch_id, event_date))');
  
  if (branchId && branchId !== 'all') {
    paymentsQuery = paymentsQuery.eq('assignments.events.branch_id', branchId);
  }
  if (startDate) {
    paymentsQuery = paymentsQuery.gte('assignments.events.event_date', startDate);
  }
  if (endDate) {
    paymentsQuery = paymentsQuery.lte('assignments.events.event_date', endDate);
  }

  const { data: payments } = await paymentsQuery;
  
  let totalPaid = 0;
  let totalPending = 0;
  
  payments?.forEach(p => {
    if (p.payment_status === 'paid') totalPaid += p.amount;
    if (p.payment_status === 'pending') totalPending += p.amount;
  });

  // 2. Attendance Rates
  let attQuery = supabase.from('attendance').select('attendance_status, assignments!inner(events!inner(branch_id, event_date))');
  
  if (branchId && branchId !== 'all') {
    attQuery = attQuery.eq('assignments.events.branch_id', branchId);
  }
  if (startDate) {
    attQuery = attQuery.gte('assignments.events.event_date', startDate);
  }
  if (endDate) {
    attQuery = attQuery.lte('assignments.events.event_date', endDate);
  }

  const { data: attendance } = await attQuery;
  const totalAtt = attendance?.length || 0;
  const presentAtt = attendance?.filter(a => a.attendance_status === 'present' || a.attendance_status === 'late').length || 0;
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

  // 3. Total Branches & Active Employees (static overall metrics)
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
    case 'branch-summary': {
      // Columns: Branch Name, Total Events, Total Assignments, Total Employees, Total Payments, Pending Payments
      const { data: branches, error } = await supabase.from('branches').select(`
        id, name,
        events (
          id, event_date,
          assignments (
            id, employee_id, payment_snapshot, assignment_status,
            payments (amount, payment_status)
          )
        )
      `).eq('is_active', true) as any;

      if (error || !branches) return [];

      return branches.map((b: any) => {
        let totalEvents = 0;
        let totalAssignments = 0;
        const employeeIds = new Set<string>();
        let totalPayments = 0;
        let pendingPayments = 0;

        b.events?.forEach((ev: any) => {
          if (!dateFilter(ev.event_date)) return;
          totalEvents++;

          ev.assignments?.forEach((a: any) => {
            if (a.assignment_status === 'removed') return;
            totalAssignments++;
            employeeIds.add(a.employee_id);

            a.payments?.forEach((p: any) => {
              const amt = Number(p.amount) || 0;
              totalPayments += amt;
              if (p.payment_status === 'pending') {
                pendingPayments += amt;
              }
            });
          });
        });

        return {
          branchName: b.name,
          totalEvents,
          totalAssignments,
          totalEmployees: employeeIds.size,
          totalPayments,
          pendingPayments
        };
      }).filter((b: any) => branchFilter(b.branchName) && searchFilter(b.branchName));
    }

    case 'branch-event': {
      // Columns: Branch, Event Date, Required Staff, Assigned Staff, Shortage, Attendance Rate
      const { data: events, error } = await supabase.from('events').select(`
        id, event_date, required_staff_count, branch_id, branches(name),
        assignments(id, assignment_status, attendance(attendance_status))
      `).eq('is_active', true) as any;

      if (error || !events) return [];

      return events.map((ev: any) => {
        const branchName = ev.branches?.name || 'N/A';
        const activeAssignments = ev.assignments?.filter((a: any) => a.assignment_status === 'assigned' || a.assignment_status === 'completed') || [];
        const assignedStaff = activeAssignments.length;
        const shortage = Math.max(0, ev.required_staff_count - assignedStaff);
        
        const attended = activeAssignments.filter((a: any) => 
          a.attendance?.some((att: any) => att.attendance_status === 'present' || att.attendance_status === 'late')
        ).length;
        const attendanceRate = assignedStaff > 0 ? Math.round((attended / assignedStaff) * 100) : 0;

        return {
          branch: branchName,
          eventDate: ev.event_date,
          requiredStaff: ev.required_staff_count,
          assignedStaff,
          shortage,
          attendanceRate: `${attendanceRate}%`
        };
      }).filter((ev: any) => dateFilter(ev.eventDate) && branchFilter(ev.branch) && (searchFilter(ev.branch) || searchFilter(ev.eventDate)));
    }

    case 'branch-payment': {
      // Columns: Branch, Paid Amount, Pending Amount, Total Amount
      const { data: branches, error } = await supabase.from('branches').select(`
        id, name,
        events (
          id, event_date,
          assignments (
            id, assignment_status,
            payments (amount, payment_status)
          )
        )
      `).eq('is_active', true) as any;

      if (error || !branches) return [];

      return branches.map((b: any) => {
        let paidAmount = 0;
        let pendingAmount = 0;

        b.events?.forEach((ev: any) => {
          if (!dateFilter(ev.event_date)) return;
          ev.assignments?.forEach((a: any) => {
            if (a.assignment_status === 'removed') return;
            a.payments?.forEach((p: any) => {
              const amt = Number(p.amount) || 0;
              if (p.payment_status === 'paid') paidAmount += amt;
              else if (p.payment_status === 'pending') pendingAmount += amt;
            });
          });
        });

        return {
          branch: b.name,
          paidAmount,
          pendingAmount,
          totalAmount: paidAmount + pendingAmount
        };
      }).filter((b: any) => branchFilter(b.branch) && searchFilter(b.branch));
    }

    case 'employee-summary': {
      // Columns: Employee Name, Total Assignments, Morning Shifts, Afternoon Shifts, Full Day Shifts, Total Earnings
      const { data: employees, error } = await supabase.from('employees').select(`
        id, users(full_name),
        assignments (
          id, assignment_status, payment_snapshot,
          shift_templates(name),
          events(event_date, branch_id, branches(name))
        )
      `).eq('is_active', true) as any;

      if (error || !employees) return [];

      return employees.map((emp: any) => {
        const name = emp.users?.full_name || 'N/A';
        let totalAssignments = 0;
        let morningShifts = 0;
        let afternoonShifts = 0;
        let fullDayShifts = 0;
        let totalEarnings = 0;

        emp.assignments?.forEach((a: any) => {
          if (a.assignment_status === 'removed' || a.assignment_status === 'replaced') return;
          if (!dateFilter(a.events?.event_date)) return;
          if (!branchFilter(a.events?.branch_id)) return;

          totalAssignments++;
          const shiftName = a.shift_templates?.name?.toLowerCase() || '';
          if (shiftName.includes('morning')) morningShifts++;
          else if (shiftName.includes('afternoon')) afternoonShifts++;
          else if (shiftName.includes('full')) fullDayShifts++;

          if (a.assignment_status === 'completed') {
            totalEarnings += Number(a.payment_snapshot) || 0;
          }
        });

        return {
          employeeName: name,
          totalAssignments,
          morningShifts,
          afternoonShifts,
          fullDayShifts,
          totalEarnings
        };
      }).filter((emp: any) => searchFilter(emp.employeeName));
    }

    case 'employee-attendance': {
      // Columns: Employee, Present, Absent, Late, Attendance Percentage
      const { data: employees, error } = await supabase.from('employees').select(`
        id, users(full_name),
        assignments (
          id, assignment_status,
          events(event_date, branch_id),
          attendance(attendance_status)
        )
      `).eq('is_active', true) as any;

      if (error || !employees) return [];

      return employees.map((emp: any) => {
        const name = emp.users?.full_name || 'N/A';
        let present = 0;
        let absent = 0;
        let late = 0;

        emp.assignments?.forEach((a: any) => {
          if (!dateFilter(a.events?.event_date)) return;
          if (!branchFilter(a.events?.branch_id)) return;

          a.attendance?.forEach((att: any) => {
            if (att.attendance_status === 'present') present++;
            else if (att.attendance_status === 'absent') absent++;
            else if (att.attendance_status === 'late') late++;
          });
        });

        const totalMarked = present + absent + late;
        const attendancePercentage = totalMarked > 0 ? Math.round(((present + late) / totalMarked) * 100) : 100;

        return {
          employee: name,
          present,
          absent,
          late,
          attendancePercentage: `${attendancePercentage}%`
        };
      }).filter((emp: any) => searchFilter(emp.employee));
    }

    case 'employee-payment': {
      // Columns: Employee, Paid Amount, Pending Amount, Total Earnings
      const { data: employees, error } = await supabase.from('employees').select(`
        id, users(full_name),
        assignments (
          id, assignment_status,
          events(event_date, branch_id),
          payments(amount, payment_status)
        )
      `).eq('is_active', true) as any;

      if (error || !employees) return [];

      return employees.map((emp: any) => {
        const name = emp.users?.full_name || 'N/A';
        let paidAmount = 0;
        let pendingAmount = 0;

        emp.assignments?.forEach((a: any) => {
          if (!dateFilter(a.events?.event_date)) return;
          if (!branchFilter(a.events?.branch_id)) return;

          a.payments?.forEach((p: any) => {
            const amt = Number(p.amount) || 0;
            if (p.payment_status === 'paid') paidAmount += amt;
            else if (p.payment_status === 'pending') pendingAmount += amt;
          });
        });

        return {
          employee: name,
          paidAmount,
          pendingAmount,
          totalEarnings: paidAmount + pendingAmount
        };
      }).filter((emp: any) => searchFilter(emp.employee));
    }

    case 'assignment-summary': {
      // Columns: Branch, Event Date, Shift, Assigned Employees, Status
      const { data: assignments, error } = await supabase.from('assignments').select(`
        id, assignment_status,
        employees(users(full_name)),
        events(event_date, branch_id, branches(name)),
        shift_templates(name)
      `) as any;

      if (error || !assignments) return [];

      return assignments.map((a: any) => ({
        branch: a.events?.branches?.name || 'N/A',
        branchId: a.events?.branch_id,
        eventDate: a.events?.event_date || 'N/A',
        shift: a.shift_templates?.name || 'N/A',
        employee: a.employees?.users?.full_name || 'N/A',
        status: a.assignment_status
      })).filter((a: any) => 
        dateFilter(a.eventDate) && 
        branchFilter(a.branchId) && 
        (searchFilter(a.employee) || searchFilter(a.branch))
      );
    }

    case 'assignment-status': {
      // Counts of Assigned, Replaced, Removed, Completed
      const { data: assignments, error } = await supabase.from('assignments').select(`
        id, assignment_status, events(event_date, branch_id)
      `) as any;

      if (error || !assignments) return [];

      let assigned = 0;
      let replaced = 0;
      let removed = 0;
      let completed = 0;

      assignments.forEach((a: any) => {
        if (!dateFilter(a.events?.event_date)) return;
        if (!branchFilter(a.events?.branch_id)) return;

        if (a.assignment_status === 'assigned') assigned++;
        else if (a.assignment_status === 'replaced') replaced++;
        else if (a.assignment_status === 'removed') removed++;
        else if (a.assignment_status === 'completed') completed++;
      });

      return [{
        assigned,
        replaced,
        removed,
        completed
      }];
    }

    case 'replacement-report': {
      // Columns: Original Employee, Replacement Employee, Event Branch, Date, Reason
      const { data: history, error } = await supabase.from('assignment_history').select(`
        id, action_type, reason, created_at,
        old_employee:employees!assignment_history_old_employee_id_fkey(users(full_name)),
        new_employee:employees!assignment_history_new_employee_id_fkey(users(full_name)),
        assignments(events(event_date, branch_id, branches(name)))
      `).eq('action_type', 'replaced').order('created_at', { ascending: false }) as any;

      if (error || !history) return [];

      return history.map((h: any) => ({
        originalEmployee: h.old_employee?.users?.full_name || 'N/A',
        replacementEmployee: h.new_employee?.users?.full_name || 'N/A',
        branch: h.assignments?.events?.branches?.name || 'N/A',
        branchId: h.assignments?.events?.branch_id,
        date: h.assignments?.events?.event_date || 'N/A',
        reason: h.reason || 'N/A'
      })).filter((h: any) => 
        dateFilter(h.date) && 
        branchFilter(h.branchId) && 
        (searchFilter(h.originalEmployee) || searchFilter(h.replacementEmployee) || searchFilter(h.branch))
      );
    }

    case 'attendance-summary': {
      // Present, Absent, Late, Replaced count overall
      const { data: attendance, error } = await supabase.from('attendance').select(`
        id, attendance_status, assignments(events(event_date, branch_id))
      `) as any;

      if (error || !attendance) return [];

      let present = 0;
      let absent = 0;
      let late = 0;
      let replaced = 0;

      attendance.forEach((a: any) => {
        if (!dateFilter(a.assignments?.events?.event_date)) return;
        if (!branchFilter(a.assignments?.events?.branch_id)) return;

        if (a.attendance_status === 'present') present++;
        else if (a.attendance_status === 'absent') absent++;
        else if (a.attendance_status === 'late') late++;
        else if (a.attendance_status === 'replaced') replaced++;
      });

      return [{
        present,
        absent,
        late,
        replaced
      }];
    }

    case 'attendance-rate': {
      // Overall attendance rate
      const { data: attendance, error } = await supabase.from('attendance').select(`
        id, attendance_status, assignments(events(event_date, branch_id))
      `) as any;

      if (error || !attendance) return [];

      let presentOrLate = 0;
      let total = 0;

      attendance.forEach((a: any) => {
        if (!dateFilter(a.assignments?.events?.event_date)) return;
        if (!branchFilter(a.assignments?.events?.branch_id)) return;

        total++;
        if (a.attendance_status === 'present' || a.attendance_status === 'late') {
          presentOrLate++;
        }
      });

      const rate = total > 0 ? Math.round((presentOrLate / total) * 100) : 100;
      return [{
        attendanceRate: `${rate}%`
      }];
    }

    case 'branch-attendance': {
      // Columns: Branch, Present, Absent, Attendance Rate
      const { data: branches, error } = await supabase.from('branches').select(`
        id, name,
        events (
          id, event_date,
          assignments (
            id, assignment_status,
            attendance (attendance_status)
          )
        )
      `).eq('is_active', true) as any;

      if (error || !branches) return [];

      return branches.map((b: any) => {
        let present = 0;
        let absent = 0;

        b.events?.forEach((ev: any) => {
          if (!dateFilter(ev.event_date)) return;

          ev.assignments?.forEach((a: any) => {
            if (a.assignment_status === 'removed') return;
            a.attendance?.forEach((att: any) => {
              if (att.attendance_status === 'present' || att.attendance_status === 'late') present++;
              else if (att.attendance_status === 'absent') absent++;
            });
          });
        });

        const total = present + absent;
        const rate = total > 0 ? Math.round((present / total) * 100) : 100;

        return {
          branch: b.name,
          present,
          absent,
          attendanceRate: `${rate}%`
        };
      }).filter((b: any) => branchFilter(b.branch) && searchFilter(b.branch));
    }

    case 'payment-summary': {
      // Paid Amount, Pending Amount, Total Amount
      const { data: payments, error } = await supabase.from('payments').select(`
        amount, payment_status, assignments(events(event_date, branch_id))
      `) as any;

      if (error || !payments) return [];

      let paidAmount = 0;
      let pendingAmount = 0;

      payments.forEach((p: any) => {
        if (!dateFilter(p.assignments?.events?.event_date)) return;
        if (!branchFilter(p.assignments?.events?.branch_id)) return;

        const amt = Number(p.amount) || 0;
        if (p.payment_status === 'paid') paidAmount += amt;
        else if (p.payment_status === 'pending') pendingAmount += amt;
      });

      return [{
        paidAmount,
        pendingAmount,
        totalAmount: paidAmount + pendingAmount
      }];
    }

    case 'monthly-payment': {
      // Columns: Month, Paid Amount, Pending Amount
      const { data: payments, error } = await supabase.from('payments').select(`
        amount, payment_status, assignments(events(event_date, branch_id))
      `) as any;

      if (error || !payments) return [];

      const monthlyData: Record<string, { paid: number; pending: number }> = {};

      payments.forEach((p: any) => {
        const dateStr = p.assignments?.events?.event_date;
        if (!dateStr || !dateFilter(dateStr)) return;
        if (!branchFilter(p.assignments?.events?.branch_id)) return;

        const date = new Date(dateStr);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { paid: 0, pending: 0 };
        }

        const amt = Number(p.amount) || 0;
        if (p.payment_status === 'paid') {
          monthlyData[monthYear].paid += amt;
        } else if (p.payment_status === 'pending') {
          monthlyData[monthYear].pending += amt;
        }
      });

      return Object.entries(monthlyData).map(([month, data]: any) => ({
        month,
        paidAmount: data.paid,
        pendingAmount: data.pending,
        totalAmount: data.paid + data.pending
      })).filter((m: any) => searchFilter(m.month));
    }

    case 'pending-payment': {
      // Columns: Employee, Branch, Amount, Event Date
      const { data: payments, error } = await supabase.from('payments').select(`
        id, amount, payment_status,
        assignments (
          employee_id,
          employees (users (full_name)),
          events (event_date, branch_id, branches (name))
        )
      `).eq('payment_status', 'pending') as any;

      if (error || !payments) return [];

      return payments.map((p: any) => ({
        employee: p.assignments?.employees?.users?.full_name || 'N/A',
        branch: p.assignments?.events?.branches?.name || 'N/A',
        branchId: p.assignments?.events?.branch_id,
        amount: p.amount,
        eventDate: p.assignments?.events?.event_date || 'N/A'
      })).filter((p: any) => 
        dateFilter(p.eventDate) && 
        branchFilter(p.branchId) && 
        (searchFilter(p.employee) || searchFilter(p.branch))
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
