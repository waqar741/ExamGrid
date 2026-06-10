'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getPayments(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const session = await getSession();
  if (!session) return { data: [], total: 0 };

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const search = options?.search || '';
  const sortBy = options?.sortBy || 'created_at';
  const sortOrder = options?.sortOrder || 'desc';

  let queryBuilder = supabase
    .from('payments')
    .select(`
      *,
      assignments!inner (
        employee_id,
        employees (users (full_name)),
        events (event_date, branches (name))
      )
    `, { count: 'exact' });

  if (session.role === 'employee') {
    queryBuilder = queryBuilder.eq('assignments.employee_id', session.userId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error('Error fetching payments:', error);
    return { data: [], total: 0 };
  }

  let finalData = data || [];
  let finalCount = count || 0;

  if (search && data) {
    const cleanSearch = search.toLowerCase();
    finalData = data.filter((item: any) => {
      const empName = item.assignments?.employees?.users?.full_name?.toLowerCase() || '';
      const branchName = item.assignments?.events?.branches?.name?.toLowerCase() || '';
      return empName.includes(cleanSearch) || branchName.includes(cleanSearch);
    });
    finalCount = finalData.length;
  }

  return { data: finalData, total: finalCount };
}

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
