'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/lib/use-debounce';
import { CreateEmployeeModal } from './create-employee-modal';
import { getEmployees, archiveEmployee } from '@/app/actions/employees';
import { Loader2, User, Phone, Mail, Hash, Loader, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { EditEmployeeModal } from './edit-employee-modal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmployeesClientProps {
  initialData: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
}

export function EmployeesClient({
  initialData,
  totalCount,
  pageSize,
  isAdmin,
}: EmployeesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 400);

  const [employees, setEmployees] = useState(initialData);
  const [total, setTotal] = useState(totalCount);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length < totalCount);

  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  // Trigger search navigation and refetch on debounced input change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard/employees?${params.toString()}`, { scroll: false });

    // Fetch new search results
    const fetchSearch = async () => {
      setLoading(true);
      const res = await getEmployees({ page: 1, pageSize, search: debouncedSearch });
      setEmployees(res.data);
      setTotal(res.total);
      setPage(1);
      setHasMore(res.data.length < res.total);
      setLoading(false);
    };

    // Prevent fetching on initial render if search hasn't changed
    if (debouncedSearch !== initialSearch || page > 1) {
       fetchSearch();
    }
  }, [debouncedSearch]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const res = await getEmployees({ page: nextPage, pageSize, search: debouncedSearch });
    
    setEmployees(prev => [...prev, ...res.data]);
    setPage(nextPage);
    setHasMore([...employees, ...res.data].length < res.total);
    setLoading(false);
  };

  const refreshList = async () => {
    const res = await getEmployees({ page: 1, pageSize: page * pageSize, search: debouncedSearch });
    setEmployees(res.data);
    setTotal(res.total);
  };

  const handleDelete = async () => {
    if (!deletingEmployeeId) return;
    setLoading(true);
    await archiveEmployee(deletingEmployeeId);
    setDeletingEmployeeId(null);
    refreshList();
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border rounded-xl bg-card shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search by name, code, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 bg-slate-50"
          />
        </div>
        {isAdmin && <CreateEmployeeModal />}
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Employee Details</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground text-sm">
                  {loading ? 'Searching...' : 'No employees found.'}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-700">
                      {emp.employee_code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {emp.users?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="font-semibold text-slate-900 text-sm">{emp.users?.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-600 flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5"><Mail className="w-3 h-3"/> {emp.users?.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> {emp.phone || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                      {emp.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setEditingEmployee(emp)} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4 text-slate-600" /> <span className="font-medium text-slate-700">Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingEmployeeId(emp.id)} className="cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> <span className="font-medium">Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards Redesign */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {employees.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card text-sm shadow-sm">
            {loading ? 'Searching...' : 'No employees found.'}
          </div>
        ) : (
          employees.map((emp) => (
            <div key={emp.id} className="flex flex-col p-5 border rounded-xl bg-white shadow-sm gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {emp.users?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{emp.users?.full_name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span className="text-xs font-mono font-medium text-slate-500">{emp.employee_code}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                  {emp.status}
                </Badge>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{emp.users?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{emp.phone || 'No phone'}</span>
                </div>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-9 font-medium border-slate-200 hover:bg-slate-50"
                    onClick={() => setEditingEmployee(emp)}
                  >
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-9 font-medium border-red-200 text-destructive hover:bg-red-50 hover:text-destructive"
                    onClick={() => setDeletingEmployeeId(emp.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4 pb-8">
          <Button variant="outline" onClick={loadMore} disabled={loading} className="min-w-[200px] bg-white border-dashed border-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Loading...' : 'Load More Employees'}
          </Button>
        </div>
      )}

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          isOpen={true}
          onClose={() => setEditingEmployee(null)}
          onUpdate={refreshList}
        />
      )}

      <ConfirmationModal
        isOpen={!!deletingEmployeeId}
        onOpenChange={(open) => !open && setDeletingEmployeeId(null)}
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This will permanently archive their record and disable their login."
        level={1}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
