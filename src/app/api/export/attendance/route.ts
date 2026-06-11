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
    .from('attendance')
    .select(`
      id,
      attendance_status,
      marked_at,
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

  const formattedData = data.map((att: any) => ({
    'Attendance ID': att.id,
    'Employee Name': att.assignments?.employees?.users?.full_name || 'N/A',
    'Branch': att.assignments?.shift_schedules?.branches?.name || 'N/A',
    'Shift': att.assignments?.shift_schedules?.shift_templates?.name || 'N/A',
    'Shift Date': att.assignments?.shift_schedules?.shift_date || 'N/A',
    'Status': (att.attendance_status || 'N/A').toUpperCase(),
    'Marked At': att.marked_at || 'N/A',
    'Remarks': att.remarks || 'N/A'
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  if (format === 'xlsx') {
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Disposition': 'attachment; filename="attendance_report.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } else {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return new NextResponse(csv, {
      headers: {
        'Content-Disposition': 'attachment; filename="attendance_report.csv"',
        'Content-Type': 'text/csv',
      },
    });
  }
}
