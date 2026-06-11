import { getAuditLogs } from '@/app/actions/audit-logs';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditLogsClient } from './audit-logs-client';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') redirect('/dashboard');

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page as string) || 1;
  const entityType = resolvedParams.entity as string || 'all';
  const actionType = resolvedParams.action as string || 'all';

  const { data: logs, total } = await getAuditLogs(page, 20, entityType, actionType);

  return (
    <div className="space-y-6 flex flex-col h-full">

      <AuditLogsClient 
        initialData={logs} 
        totalItems={total} 
        currentPage={page} 
        currentEntity={entityType} 
        currentAction={actionType} 
      />
    </div>
  );
}
