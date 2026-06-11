'use client';

import { useState } from 'react';
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
import { CreateRateModal } from './create-rate-modal';
import { EditRateModal } from './edit-rate-modal';
import { Loader2, Banknote, CalendarClock, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PayRatesClientProps {
  initialData: any[];
  branches: any[];
}

export function PayRatesClient({ initialData, branches }: PayRatesClientProps) {
  const SHIFT_TYPES: Record<string, string> = {
    'MORNING': 'Morning',
    'AFTERNOON': 'Afternoon', 
    'FULL_DAY': 'Full Day'
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(15);
  const [loadingMore, setLoadingMore] = useState(false);

  // Derive Status
  const getStatus = (rate: any) => {
    const today = new Date().toISOString().split('T')[0];
    if (rate.effective_to && rate.effective_to < today) return 'Expired';
    if (rate.effective_from > today) return 'Scheduled';
    return 'Active';
  };

  const filteredData = initialData.filter(rate => {
    const matchesSearch = 
      rate.branches?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (SHIFT_TYPES[rate.shift_type] || rate.shift_type)?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const displayedData = filteredData.slice(0, visibleCount);
  const hasMore = visibleCount < filteredData.length;

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 15);
      setLoadingMore(false);
    }, 300); // Small fake delay for smooth UX
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl bg-card shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search by branch or shift..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(15);
            }}
            className="w-full pl-4 bg-slate-50"
          />
        </div>
        <div className="w-full sm:w-auto">
          <CreateRateModal branches={branches} />
        </div>
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Branch Details</TableHead>
              <TableHead>Shift Type</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Validity Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground text-sm">
                  No pay rates found.
                </TableCell>
              </TableRow>
            ) : (
              displayedData.map((rate) => {
                const status = getStatus(rate);
                return (
                  <TableRow key={rate.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <span className="font-medium text-slate-900 text-sm block">{rate.branches?.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {SHIFT_TYPES[rate.shift_type] || rate.shift_type.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm border border-green-100">
                        ₹{rate.rate}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-600 flex flex-col gap-0.5">
                        <span>From: {format(new Date(rate.effective_from), 'MMM d, yyyy')}</span>
                        <span className="text-slate-500">
                          To: {rate.effective_to ? format(new Date(rate.effective_to), 'MMM d, yyyy') : 'Ongoing'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        status === 'Active' ? 'default' :
                        status === 'Scheduled' ? 'secondary' : 'outline'
                      } className={status === 'Active' ? 'bg-blue-600 hover:bg-blue-700' : ''}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* For pay rates, the EditRateModal includes its own dialog trigger, 
                          but we want it inside the dropdown or just keep it as an icon. 
                          Wait, EditRateModal is currently a Dialog triggered by a button.
                          Let's wrap it nicely so it doesn't break the dropdown. */}
                      <div className="flex justify-end">
                        <EditRateModal rate={rate} status={status} branches={branches} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="flex flex-col md:hidden border rounded-md overflow-hidden bg-white shadow-sm">
        {displayedData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-xs">
            No pay rates found.
          </div>
        ) : (
          displayedData.map((rate) => {
            const status = getStatus(rate);
            return (
              <div key={rate.id} className="flex flex-col p-3 border-b last:border-b-0 gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 text-sm leading-tight">{rate.branches?.name}</span>
                    <span className="text-xs text-slate-500 mt-0.5">{SHIFT_TYPES[rate.shift_type] || rate.shift_type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-green-600 text-sm">₹{rate.rate}</span>
                    <Badge variant="secondary" className="text-[9px] leading-none px-1.5 py-0.5 mt-1">
                      {status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] text-slate-500">
                    {format(new Date(rate.effective_from), 'MMM d, yy')} - {rate.effective_to ? format(new Date(rate.effective_to), 'MMM d, yy') : 'Ongoing'}
                  </div>
                  <div className="scale-90 origin-right">
                    <EditRateModal rate={rate} status={status} branches={branches} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4 pb-8">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="min-w-[200px] bg-white border-dashed border-2">
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loadingMore ? 'Loading...' : 'Load More Rates'}
          </Button>
        </div>
      )}
    </div>
  );
}
