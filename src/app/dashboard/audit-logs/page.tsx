import { getAuditLogs } from '@/app/actions/audit-logs';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditLogsClient } from './audit-logs-client';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') redirect('/dashboard');

  const page = parseInt(searchParams.page as string) || 1;
  const entityType = searchParams.entity as string || 'all';
  const actionType = searchParams.action as string || 'all';

  const { data: logs, total } = await getAuditLogs(page, 20, entityType, actionType);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Audit Logs</h2>
        <p className="text-muted-foreground">
          Track and verify administrative changes across the system.
        </p>
      </div>

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
