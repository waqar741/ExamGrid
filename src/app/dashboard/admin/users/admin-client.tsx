'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useDebounce } from '@/lib/use-debounce';
import { Loader2, MoreHorizontal, User, Mail, ShieldAlert, Clock, Trash2, Ban, CheckCircle2, Edit } from 'lucide-react';
import { getAdmins, toggleAdminStatus, deleteAdmin } from '@/app/actions/admin-users';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { EditAdminModal } from './edit-admin-modal';
import { CreateAdminModal } from './create-admin-modal';

interface AdminClientProps {
  initialData: any[];
  totalCount: number;
  currentPage: number;
  currentUserId: string;
}

export function AdminClient({ initialData, totalCount, currentUserId }: AdminClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(totalCount);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length < totalCount);

  const [editingAdmin, setEditingAdmin] = useState<any>(null);

  // Search effect
  useState(() => {
    // Basic search effect if needed, but for now we'll handle search completely client-side 
    // for small lists or use the loadMore pattern.
  });

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const res = await getAdmins({ page: nextPage, pageSize: 10, search: debouncedSearch });
    
    setData(prev => [...prev, ...res.data]);
    setPage(nextPage);
    setHasMore([...data, ...res.data].length < res.total);
    setLoading(false);
  };

  const filteredData = data.filter((admin) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return admin.full_name.toLowerCase().includes(s) || admin.email.toLowerCase().includes(s);
  });

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const res = await toggleAdminStatus(id, currentStatus);
    if (res?.error) return res;
    
    // Optimistic update
    setData(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
    return res;
  };

  const handleDelete = async (id: string) => {
    const res = await deleteAdmin(id);
    if (res?.error) return res;
    
    setData(prev => prev.filter(a => a.id !== id));
    setTotal(t => t - 1);
    return res;
  };

  return (
    <div className="space-y-4">
      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          open={!!editingAdmin}
          onOpenChange={(open) => !open && setEditingAdmin(null)}
          onSuccess={(updated) => setData(prev => prev.map(a => a.id === updated.id ? updated : a))}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl bg-card shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search admins by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 bg-slate-50"
          />
        </div>
        <CreateAdminModal />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Administrator</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground text-sm">
                  No administrators found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((admin) => (
                <TableRow key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-900 text-sm">{admin.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {admin.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs font-medium text-slate-600 bg-slate-50">
                      {admin.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={admin.is_active ? 'default' : 'secondary'} className={`text-[10px] ${admin.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                      {admin.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {format(new Date(admin.created_at), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {admin.id !== currentUserId && admin.role !== 'super_admin' ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingAdmin(admin)} className="cursor-pointer text-slate-700">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                            <ConfirmationModal
                              level={3}
                              title={admin.is_active ? "Disable Administrator" : "Restore Administrator"}
                              description={`Are you sure you want to ${admin.is_active ? 'disable' : 'restore'} ${admin.full_name}?`}
                              confirmLabel={admin.is_active ? "Disable" : "Restore"}
                              confirmVariant={admin.is_active ? "destructive" : "default"}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className={`cursor-pointer ${admin.is_active ? 'text-orange-600 focus:text-orange-600' : 'text-emerald-600 focus:text-emerald-600'}`}>
                                  {admin.is_active ? <Ban className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                  {admin.is_active ? 'Disable Access' : 'Restore Access'}
                                </DropdownMenuItem>
                              }
                              onConfirm={async () => {
                                return await handleToggle(admin.id, admin.is_active);
                              }}
                          />
                          
                          <DropdownMenuSeparator />
                          
                            <ConfirmationModal
                              level={3}
                              title="Delete Administrator"
                              description={`Are you absolutely sure you want to permanently delete ${admin.full_name}? This action cannot be undone. Please type CONFIRM to proceed.`}
                              confirmLabel="Delete"
                              confirmVariant="destructive"
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Admin
                                </DropdownMenuItem>
                              }
                              onConfirm={async () => {
                                return await handleDelete(admin.id);
                              }}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No actions</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="flex flex-col md:hidden border rounded-md overflow-hidden bg-white shadow-sm">
        {filteredData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-xs">
            No administrators found.
          </div>
        ) : (
          filteredData.map((admin) => (
            <div key={admin.id} className="flex flex-col p-4 border-b last:border-b-0 gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <ShieldAlert className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-sm">{admin.full_name}</span>
                    <span className="text-xs text-slate-500 mt-0.5">{admin.email}</span>
                  </div>
                </div>
                <Badge variant={admin.is_active ? 'default' : 'secondary'} className={`text-[10px] whitespace-nowrap ${admin.is_active ? 'bg-emerald-500' : ''}`}>
                  {admin.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-[10px] text-slate-600 bg-slate-50">
                    {admin.role.replace('_', ' ')}
                  </Badge>
                </div>

                {admin.id !== currentUserId && admin.role !== 'super_admin' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingAdmin(admin)} className="h-7 px-2 text-xs text-slate-600">
                      Edit
                    </Button>
                    <ConfirmationModal
                      level={3}
                      title={admin.is_active ? "Disable Admin" : "Restore Admin"}
                      description={`Are you sure?`}
                      confirmLabel={admin.is_active ? "Disable" : "Restore"}
                      confirmVariant={admin.is_active ? "destructive" : "default"}
                      trigger={
                        <Button variant="outline" size="sm" className={`h-7 px-2 text-xs ${admin.is_active ? 'text-orange-600 border-orange-200' : 'text-emerald-600 border-emerald-200'}`}>
                          {admin.is_active ? 'Disable' : 'Restore'}
                        </Button>
                      }
                      onConfirm={async () => {
                        return await handleToggle(admin.id, admin.is_active);
                      }}
                    />
                    <ConfirmationModal
                      level={3}
                      title="Delete Admin"
                      description={`Type CONFIRM to permanently delete this admin.`}
                      confirmLabel="Delete"
                      confirmVariant="destructive"
                      trigger={
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-destructive border-red-200">
                          Delete
                        </Button>
                      }
                      onConfirm={async () => {
                        return await handleDelete(admin.id);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4 pb-8">
          <Button variant="outline" onClick={loadMore} disabled={loading} className="min-w-[200px] bg-white border-dashed border-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Loading...' : 'Load More Admins'}
          </Button>
        </div>
      )}
    </div>
  );
}
