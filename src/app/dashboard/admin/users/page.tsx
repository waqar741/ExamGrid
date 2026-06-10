import { getAdmins } from '@/app/actions/admin-users';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CreateAdminModal } from './create-admin-modal';
import { ToggleAdminAction } from './toggle-admin-action';

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') redirect('/dashboard');

  const admins = await getAdmins();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Management</h2>
          <p className="text-muted-foreground">
            Manage system administrators and their access.
          </p>
        </div>
        <CreateAdminModal />
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No administrators found.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.full_name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{admin.role.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                      {admin.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(admin.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    {admin.id !== session.userId && admin.role !== 'super_admin' && (
                      <ToggleAdminAction userId={admin.id} currentStatus={admin.is_active} />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {admins.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card">No administrators found.</div>
        ) : (
          admins.map((admin) => (
            <div key={admin.id} className="flex flex-col gap-2 p-4 border rounded-md bg-card">
              <div className="flex justify-between items-start">
                <div className="font-semibold">{admin.full_name}</div>
                <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                  {admin.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">{admin.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="capitalize">{admin.role.replace('_', ' ')}</Badge>
                <div className="text-xs text-muted-foreground">
                  Created {format(new Date(admin.created_at), 'MMM d, yyyy')}
                </div>
              </div>
              <div className="mt-2 text-right">
                {admin.id !== session.userId && admin.role !== 'super_admin' && (
                  <ToggleAdminAction userId={admin.id} currentStatus={admin.is_active} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
