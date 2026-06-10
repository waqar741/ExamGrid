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
import { format } from 'date-fns';
import Link from 'next/link';
import { TablePagination } from '@/components/ui/table-pagination';
import { useDebounce } from '@/lib/use-debounce';
import { CreateBranchModal } from './create-branch-modal';

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
  currentPage,
  pageSize,
  isAdmin,
}: BranchesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard/branches?${params.toString()}`);
  }, [debouncedSearch]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/branches?${params.toString()}`);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('pageSize', String(size));
    router.push(`/dashboard/branches?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border rounded-md bg-card">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search branches by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs"
          />
        </div>
        {isAdmin && <CreateBranchModal />}
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground text-xs">
                  No branches found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((branch) => (
                <TableRow key={branch.id} className="hover:bg-muted/10">
                  <TableCell className="font-semibold text-xs">{branch.name}</TableCell>
                  <TableCell className="max-w-md truncate text-xs">{branch.description || '-'}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(branch.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/branches/${branch.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {initialData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card text-xs">No branches found.</div>
        ) : (
          initialData.map((branch) => (
            <div key={branch.id} className="flex flex-col gap-2 p-4 border rounded-md bg-card text-xs">
              <div className="font-semibold text-lg">{branch.name}</div>
              <div className="text-sm text-muted-foreground">{branch.description || 'No description'}</div>
              <div className="text-xs text-muted-foreground">
                Created: {format(new Date(branch.created_at), 'MMM d, yyyy')}
              </div>
              <div className="mt-2">
                <Link href={`/dashboard/branches/${branch.id}`}>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs">View Details</Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
