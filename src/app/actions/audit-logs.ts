'use server';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function getAuditLogs(page = 1, pageSize = 20, entityType?: string, actionType?: string) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return { data: [], total: 0 };
  }

  let query = supabase
    .from('audit_logs')
    .select('*, users(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (entityType && entityType !== 'all') {
    query = query.eq('entity_type', entityType);
  }
  if (actionType && actionType !== 'all') {
    query = query.eq('action', actionType);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('Error fetching audit logs:', error);
    return { data: [], total: 0 };
  }

  return { data, total: count || 0 };
}
