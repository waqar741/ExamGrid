import { getAdmins } from '@/app/actions/admin-users';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

import { AdminClient } from './admin-client';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') redirect('/dashboard');

  const page = parseInt(searchParams.page as string) || 1;
  const search = searchParams.search as string || '';

  const { data: admins, total } = await getAdmins({ page, pageSize: 10, search });

  return (
    <div className="space-y-6">


      <AdminClient 
        initialData={admins}
        totalCount={total}
        currentPage={page}
        currentUserId={session.userId}
      />
    </div>
  );
}
