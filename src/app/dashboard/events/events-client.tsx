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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import Link from 'next/link';
import { TablePagination } from '@/components/ui/table-pagination';
import { useDebounce } from '@/lib/use-debounce';
import { CreateEventModal } from './create-event-modal';

interface EventsClientProps {
  initialData: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
  branches: any[];
}

export function EventsClient({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  isAdmin,
  branches,
}: EventsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialBranch = searchParams.get('branchId') || 'all';

  const [search, setSearch] = useState(initialSearch);
  const [branchId, setBranchId] = useState(initialBranch);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard/events?${params.toString()}`);
  }, [debouncedSearch]);

  const handleBranchChange = (val: string) => {
    setBranchId(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (val && val !== 'all') {
      params.set('branchId', val);
    } else {
      params.delete('branchId');
    }
    router.push(`/dashboard/events?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/events?${params.toString()}`);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('pageSize', String(size));
    router.push(`/dashboard/events?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border rounded-md bg-card">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
          <Input
            type="search"
            placeholder="Search by notes or center name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[260px] text-xs"
          />
          <Select value={branchId} onValueChange={(val) => handleBranchChange(val || 'all')}>
            <SelectTrigger className="w-full sm:w-[180px] text-xs h-8 bg-transparent">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && <CreateEventModal branches={branches} />}
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Required Staff</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-xs">
                  No events found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((event) => (
                <TableRow key={event.id} className="hover:bg-muted/10">
                  <TableCell className="font-semibold text-xs">
                    {format(new Date(event.event_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-xs">{event.branches?.name}</TableCell>
                  <TableCell className="text-xs">{event.required_staff_count}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{event.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/events/${event.id}`}>
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
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card text-xs">No events found.</div>
        ) : (
          initialData.map((event) => (
            <div key={event.id} className="flex flex-col gap-2 p-4 border rounded-md bg-card text-xs">
              <div className="flex justify-between items-start">
                <div className="font-semibold">{format(new Date(event.event_date), 'MMM d, yyyy')}</div>
                <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                  Staff: {event.required_staff_count}
                </div>
              </div>
              <div className="text-xs font-medium">{event.branches?.name}</div>
              <div className="text-xs text-muted-foreground">{event.notes || 'No notes'}</div>
              <div className="mt-2">
                <Link href={`/dashboard/events/${event.id}`}>
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
