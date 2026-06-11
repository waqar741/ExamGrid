'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, FileJson, Clock, User } from 'lucide-react';
import { getAuditLogs } from '@/app/actions/audit-logs';

interface AuditLogsClientProps {
  initialData: any[];
  totalItems: number;
  currentPage: number;
  currentEntity: string;
  currentAction: string;
}

export function AuditLogsClient({ initialData, totalItems, currentPage, currentEntity, currentAction }: AuditLogsClientProps) {
  const router = useRouter();
  
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(currentPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length < totalItems);

  // When filters change via URL, update local data state
  useEffect(() => {
    setData(initialData);
    setPage(currentPage);
    setHasMore(initialData.length < totalItems);
  }, [initialData, totalItems, currentPage]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const res = await getAuditLogs(nextPage, 20, currentEntity, currentAction);
    
    setData(prev => [...prev, ...res.data]);
    setPage(nextPage);
    setHasMore([...data, ...res.data].length < res.total);
    setLoading(false);
  };

  const handleFilterChange = (entity: string, action: string) => {
    router.push(`/dashboard/audit-logs?entity=${entity}&action=${action}`);
  };

  const entities = ['all', 'branches', 'employees', 'events', 'shift_templates', 'assignments', 'branch_pay_rates', 'users'];
  const actions = ['all', 'CREATE', 'UPDATE', 'ARCHIVE', 'DELETE'];

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border rounded-xl bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select 
            value={currentEntity} 
            onValueChange={(val) => handleFilterChange(val || 'all', currentAction)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <span className="flex-1 text-left truncate capitalize">
                {currentEntity === 'all' ? 'All Entities' : currentEntity.replace('_', ' ')}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Entities">All Entities</SelectItem>
              <SelectItem value="users" label="Users">Users</SelectItem>
              <SelectItem value="employees" label="Employees">Employees</SelectItem>
              <SelectItem value="branches" label="Branches">Branches</SelectItem>
              <SelectItem value="shift_templates" label="Shift Templates">Shift Templates</SelectItem>
              <SelectItem value="branch_pay_rates" label="Pay Rates">Pay Rates</SelectItem>
              <SelectItem value="shift_schedules" label="Shift Schedules">Shift Schedules</SelectItem>
              <SelectItem value="assignments" label="Assignments">Assignments</SelectItem>
              <SelectItem value="attendance" label="Attendance">Attendance</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={currentAction} 
            onValueChange={(val) => handleFilterChange(currentEntity, val || 'all')}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <span className="flex-1 text-left truncate">
                {currentAction === 'all' ? 'All Actions' : currentAction === 'INSERT' ? 'Create (INSERT)' : currentAction === 'UPDATE' ? 'Update (UPDATE)' : currentAction === 'DELETE' ? 'Delete (DELETE)' : currentAction.charAt(0).toUpperCase() + currentAction.slice(1).toLowerCase()}
              </span>
            </SelectTrigger>
            <SelectContent>
              {actions.map(a => (
                <SelectItem key={a} value={a} label={a === 'all' ? 'All Actions' : a}>
                  {a === 'all' ? 'All Actions' : a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="ghost" onClick={() => handleFilterChange('all', 'all')} className="text-slate-500 hover:text-slate-900">
          Clear Filters
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground text-sm">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 text-sm flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {log.users?.full_name || log.user_id}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500 uppercase">
                    {log.entity_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      log.action === 'CREATE' ? 'default' :
                      log.action === 'UPDATE' ? 'secondary' : 'destructive'
                    } className={`text-[10px] ${log.action === 'CREATE' ? 'bg-blue-600' : ''}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                          <FileJson className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Audit Log Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          {log.old_values && (
                            <div>
                              <h4 className="font-medium text-xs text-slate-500 uppercase tracking-wider mb-2">Previous State</h4>
                              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <h4 className="font-medium text-xs text-slate-500 uppercase tracking-wider mb-2">New State</h4>
                              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
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

      {/* Mobile View */}
      <div className="flex flex-col md:hidden border rounded-md overflow-hidden bg-white shadow-sm">
        {data.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-xs">
            No audit logs found.
          </div>
        ) : (
          data.map((log) => (
            <div key={log.id} className="flex flex-col p-3 border-b last:border-b-0 gap-2">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-slate-900 text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {log.users?.full_name || log.user_id}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">
                    {log.entity_type}
                  </span>
                </div>
                <Badge variant={
                  log.action === 'CREATE' ? 'default' :
                  log.action === 'UPDATE' ? 'secondary' : 'destructive'
                } className={`text-[9px] leading-none px-1.5 py-0.5 capitalize ${log.action === 'CREATE' ? 'bg-blue-600' : ''}`}>
                  {log.action}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2">View Data</Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Audit Log Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      {log.old_values && (
                        <div>
                          <h4 className="font-medium text-xs text-slate-500 uppercase tracking-wider mb-2">Previous State</h4>
                          <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(log.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div>
                          <h4 className="font-medium text-xs text-slate-500 uppercase tracking-wider mb-2">New State</h4>
                          <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
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

      {hasMore && (
        <div className="flex justify-center pt-4 pb-8">
          <Button variant="outline" onClick={loadMore} disabled={loading} className="min-w-[200px] bg-white border-dashed border-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Loading...' : 'Load More Logs'}
          </Button>
        </div>
      )}
    </div>
  );
}
