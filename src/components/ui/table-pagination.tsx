'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading = false,
}: TablePaginationProps) {
  if (totalPages <= 1 && totalItems <= pageSize && !onPageSizeChange) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t bg-card text-xs text-muted-foreground select-none">
      <div className="flex items-center gap-4">
        {totalItems > 0 && (
          <span>
            Showing <span className="font-semibold text-foreground">{startIdx}</span> to{' '}
            <span className="font-semibold text-foreground">{endIdx}</span> of{' '}
            <span className="font-semibold text-foreground">{totalItems}</span> records
          </span>
        )}

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
              disabled={loading}
            >
              <SelectTrigger className="h-7 w-[65px] text-xs px-1 bg-transparent border border-border">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded border-border"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || loading}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="sr-only">Previous Page</span>
        </Button>
        <div className="text-xs font-medium px-2">
          Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded border-border"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0 || loading}
        >
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="sr-only">Next Page</span>
        </Button>
      </div>
    </div>
  );
}
