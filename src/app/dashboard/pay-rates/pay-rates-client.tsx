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

interface PayRatesClientProps {
  initialData: any[];
  branches: any[];
  shifts: any[];
}

export function PayRatesClient({ initialData, branches, shifts }: PayRatesClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      rate.shift_templates?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Input
          placeholder="Search by branch or shift..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:max-w-sm"
        />
        <div className="w-full sm:w-auto">
          <CreateRateModal branches={branches} shifts={shifts} />
        </div>
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No pay rates found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((rate) => {
                const status = getStatus(rate);
                return (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.branches?.name}</TableCell>
                    <TableCell>{rate.shift_templates?.name}</TableCell>
                    <TableCell className="font-bold text-green-600">₹{rate.rate}</TableCell>
                    <TableCell>{format(new Date(rate.effective_from), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {rate.effective_to ? format(new Date(rate.effective_to), 'MMM d, yyyy') : 'Ongoing'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        status === 'Active' ? 'default' :
                        status === 'Scheduled' ? 'secondary' : 'outline'
                      }>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditRateModal rate={rate} status={status} branches={branches} shifts={shifts} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {paginatedData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card">No pay rates found.</div>
        ) : (
          paginatedData.map((rate) => {
            const status = getStatus(rate);
            return (
              <div key={rate.id} className="flex flex-col gap-2 p-4 border rounded-md bg-card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{rate.branches?.name}</div>
                    <div className="text-sm text-muted-foreground">{rate.shift_templates?.name}</div>
                  </div>
                  <Badge variant={
                    status === 'Active' ? 'default' :
                    status === 'Scheduled' ? 'secondary' : 'outline'
                  }>
                    {status}
                  </Badge>
                </div>
                <div className="font-bold text-green-600 text-lg mt-2">₹{rate.rate}</div>
                <div className="text-sm text-muted-foreground">
                  Valid: {format(new Date(rate.effective_from), 'MMM d, yyyy')} - {rate.effective_to ? format(new Date(rate.effective_to), 'MMM d, yyyy') : 'Ongoing'}
                </div>
                <div className="mt-2">
                  <EditRateModal rate={rate} status={status} branches={branches} shifts={shifts} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
