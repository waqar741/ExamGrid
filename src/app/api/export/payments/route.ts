import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const branchId = searchParams.get('branch');
  const format = searchParams.get('format') || 'csv';

  let query = supabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_status,
      payment_date,
      remarks,
      assignments!inner(
        employees(users(full_name)),
        shift_schedules!inner(shift_date, branches(id, name), shift_templates(name))
      )
    `)
    .order('created_at', { ascending: false });

  if (branchId && branchId !== 'all') {
    query = query.eq('assignments.shift_schedules.branch_id', branchId);
  }
  if (startDate) {
    query = query.gte('assignments.shift_schedules.shift_date', startDate);
  }
  if (endDate) {
    query = query.lte('assignments.shift_schedules.shift_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    return new NextResponse('Error fetching data', { status: 500 });
  }

  const formattedData = data.map((p: any) => ({
    'Payment ID': p.id,
    'Employee Name': p.assignments?.employees?.users?.full_name || 'N/A',
    'Branch': p.assignments?.shift_schedules?.branches?.name || 'N/A',
    'Shift': p.assignments?.shift_schedules?.shift_templates?.name || 'N/A',
    'Shift Date': p.assignments?.shift_schedules?.shift_date || 'N/A',
    'Amount (INR)': p.amount,
    'Status': (p.payment_status || 'N/A').toUpperCase(),
    'Payment Date': p.payment_date || 'N/A',
    'Remarks': p.remarks || 'N/A'
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');

  if (format === 'xlsx') {
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Disposition': 'attachment; filename="payments_report.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } else {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return new NextResponse(csv, {
      headers: {
        'Content-Disposition': 'attachment; filename="payments_report.csv"',
        'Content-Type': 'text/csv',
      },
    });
  }
}
