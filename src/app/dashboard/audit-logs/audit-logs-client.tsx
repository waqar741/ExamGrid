'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AuditLogsClientProps {
  initialData: any[];
  totalItems: number;
  currentPage: number;
  currentEntity: string;
  currentAction: string;
}

export function AuditLogsClient({ initialData, totalItems, currentPage, currentEntity, currentAction }: AuditLogsClientProps) {
  const router = useRouter();
  const totalPages = Math.ceil(totalItems / 20);

  const handleFilterChange = (entity: string, action: string) => {
    router.push(`/dashboard/audit-logs?page=1&entity=${entity}&action=${action}`);
  };

  const entities = ['all', 'branches', 'employees', 'events', 'shift_templates', 'assignments', 'branch_pay_rates', 'users'];
  const actions = ['all', 'CREATE', 'UPDATE', 'ARCHIVE', 'DELETE'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-md bg-muted/10">
        <div className="grid gap-2 w-full sm:w-auto">
          <label className="text-sm font-medium">Entity Type</label>
          <Select 
            value={currentEntity} 
            onValueChange={(val) => handleFilterChange(val || 'all', currentAction)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              {entities.map(e => (
                <SelectItem key={e} value={e}>{e === 'all' ? 'All Entities' : e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 w-full sm:w-auto">
          <label className="text-sm font-medium">Action Type</label>
          <Select 
            value={currentAction} 
            onValueChange={(val) => handleFilterChange(currentEntity, val || 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {actions.map(a => (
                <SelectItem key={a} value={a}>{a === 'all' ? 'All Actions' : a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => handleFilterChange('all', 'all')}>
            Clear
          </Button>
        </div>
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    {log.users?.full_name || log.user_id}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.entity_type}</TableCell>
                  <TableCell>
                    <Badge variant={
                      log.action === 'CREATE' ? 'default' :
                      log.action === 'UPDATE' ? 'secondary' : 'destructive'
                    }>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">View JSON</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Log Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {log.old_values && (
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-2">Old Values</h4>
                              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-2">New Values</h4>
                              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
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
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card">No audit logs found.</div>
        ) : (
          initialData.map((log) => (
            <div key={log.id} className="flex flex-col gap-2 p-4 border rounded-md bg-card">
              <div className="flex justify-between items-start">
                <div className="font-semibold">{log.users?.full_name || log.user_id}</div>
                <Badge variant={
                  log.action === 'CREATE' ? 'default' :
                  log.action === 'UPDATE' ? 'secondary' : 'destructive'
                }>
                  {log.action}
                </Badge>
              </div>
              <div className="text-sm font-mono text-muted-foreground">{log.entity_type}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
              </div>
              <div className="mt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">View JSON</Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Log Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {log.old_values && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Old Values</h4>
                          <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                            {JSON.stringify(log.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">New Values</h4>
                          <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/audit-logs?page=${Math.max(1, currentPage - 1)}&entity=${currentEntity}&action=${currentAction}`)}
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
            onClick={() => router.push(`/dashboard/audit-logs?page=${Math.min(totalPages, currentPage + 1)}&entity=${currentEntity}&action=${currentAction}`)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
