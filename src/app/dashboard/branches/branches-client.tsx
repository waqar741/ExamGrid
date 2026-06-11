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
import { format } from 'date-fns';
import { useDebounce } from '@/lib/use-debounce';
import { CreateBranchModal } from './create-branch-modal';
import { getBranches, archiveBranch } from '@/app/actions/branches';
import { Loader2, Building2, AlignLeft, CalendarClock, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { EditBranchModal } from './edit-branch-modal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BranchesClientProps {
  initialData: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
}

export function BranchesClient({
  initialData,
  totalCount,
  pageSize,
  isAdmin,
}: BranchesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 400);

  const [branches, setBranches] = useState(initialData);
  const [total, setTotal] = useState(totalCount);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length < totalCount);

  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

  // Trigger search navigation and refetch on debounced input change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard/branches?${params.toString()}`, { scroll: false });

    // Fetch new search results
    const fetchSearch = async () => {
      setLoading(true);
      const res = await getBranches({ page: 1, pageSize, search: debouncedSearch });
      setBranches(res.data);
      setTotal(res.total);
      setPage(1);
      setHasMore(res.data.length < res.total);
      setLoading(false);
    };

    if (debouncedSearch !== initialSearch || page > 1) {
       fetchSearch();
    }
  }, [debouncedSearch]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const res = await getBranches({ page: nextPage, pageSize, search: debouncedSearch });
    
    setBranches(prev => [...prev, ...res.data]);
    setPage(nextPage);
    setHasMore([...branches, ...res.data].length < res.total);
    setLoading(false);
  };

  const refreshList = async () => {
    const res = await getBranches({ page: 1, pageSize: page * pageSize, search: debouncedSearch });
    setBranches(res.data);
    setTotal(res.total);
  };

  const handleDelete = async () => {
    if (!deletingBranchId) return;
    setLoading(true);
    await archiveBranch(deletingBranchId);
    setDeletingBranchId(null);
    refreshList();
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border rounded-xl bg-card shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search by branch name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 bg-slate-50"
          />
        </div>
        {isAdmin && <CreateBranchModal />}
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Branch Details</TableHead>
              <TableHead>Available Shifts</TableHead>
              <TableHead>Created Date</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="text-center h-32 text-muted-foreground text-sm">
                  {loading ? 'Searching...' : 'No branches found.'}
                </TableCell>
              </TableRow>
            ) : (
              branches.map((branch) => (
                <TableRow key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div>
                      <span className="font-medium text-slate-900 text-sm block">{branch.name}</span>
                      {branch.description && (
                        <span className="text-xs text-slate-500 mt-0.5 max-w-[250px] truncate block">
                          {branch.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                      {(branch.available_shift_types || ['MORNING', 'AFTERNOON', 'FULL_DAY']).map((st: string) => (
                        <Badge key={st} variant="secondary" className="text-[10px] leading-none px-1.5 py-0.5">
                          {st.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {format(new Date(branch.created_at), 'MMM d, yyyy')}
                    </span>
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
                          <DropdownMenuItem onClick={() => setEditingBranch(branch)} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4 text-slate-600" /> <span className="font-medium text-slate-700">Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingBranchId(branch.id)} className="cursor-pointer text-destructive focus:text-destructive">
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

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {branches.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card text-sm shadow-sm">
            {loading ? 'Searching...' : 'No branches found.'}
          </div>
        ) : (
          branches.map((branch) => (
            <div key={branch.id} className="flex flex-col p-4 border rounded-md bg-white shadow-sm gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900 text-base">{branch.name}</h3>
                  {branch.description && (
                    <p className="text-sm text-slate-500 mt-0.5 leading-snug">
                      {branch.description}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap gap-1">
                  {(branch.available_shift_types || ['MORNING', 'AFTERNOON', 'FULL_DAY']).map((st: string) => (
                    <Badge key={st} variant="secondary" className="text-[10px] leading-none px-1.5 py-0.5">
                      {st.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="text-xs text-slate-500">
                Created: {format(new Date(branch.created_at), 'MMM d, yyyy')}
              </div>

              {isAdmin && (
                <div className="flex gap-2 mt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-xs font-medium border-slate-200"
                    onClick={() => setEditingBranch(branch)}
                  >
                    <Edit className="w-3 h-3 mr-1.5" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-xs font-medium border-red-200 text-destructive hover:bg-red-50 hover:text-destructive"
                    onClick={() => setDeletingBranchId(branch.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" /> Delete
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
            {loading ? 'Loading...' : 'Load More Branches'}
          </Button>
        </div>
      )}

      {editingBranch && (
        <EditBranchModal
          branch={editingBranch}
          isOpen={true}
          onClose={() => setEditingBranch(null)}
          onUpdate={refreshList}
        />
      )}

      <ConfirmationModal
        isOpen={!!deletingBranchId}
        onOpenChange={(open) => !open && setDeletingBranchId(null)}
        title="Delete Branch"
        description="Are you sure you want to delete this branch? This will archive the branch and it will no longer be available for scheduling new shifts."
        level={1}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
