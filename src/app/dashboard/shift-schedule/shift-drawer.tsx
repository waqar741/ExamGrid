'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getShiftScheduleById } from '@/app/actions/shift-schedules';

interface ShiftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shiftScheduleId: string | null;
}

export function ShiftDrawer({ isOpen, onClose, shiftScheduleId }: ShiftDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [shiftData, setShiftData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && shiftScheduleId) {
      loadShiftData();
    } else {
      setShiftData(null);
    }
  }, [isOpen, shiftScheduleId]);

  const loadShiftData = async () => {
    setLoading(true);
    try {
      const data = await getShiftScheduleById(shiftScheduleId!);
      setShiftData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!shiftData && loading) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-xl">
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!shiftData) return null;

  const assignments = shiftData.assignments || [];
  const activeAssignments = assignments.filter((a: any) => a.assignment_status === 'assigned' || a.assignment_status === 'completed');
  const removedAssignments = assignments.filter((a: any) => a.assignment_status === 'removed' || a.assignment_status === 'replaced');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl flex items-center gap-2">
            {shiftData.branches?.name} - {shiftData.shift_type}
          </SheetTitle>
          <SheetDescription>
            {new Date(shiftData.shift_date).toLocaleDateString('en-GB', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground font-medium mb-1">Required Staff</p>
              <p className="text-2xl font-bold">{shiftData.required_staff_count}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground font-medium mb-1">Assigned</p>
              <p className="text-2xl font-bold">{activeAssignments.length}</p>
            </div>
          </div>

          {/* Active Assigned Staff */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center justify-between">
              Assigned Staff
              <Badge variant="outline">{activeAssignments.length}</Badge>
            </h3>
            
            {activeAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-slate-50 p-4 rounded-lg border">
                No staff assigned yet.
              </p>
            ) : (
              <div className="space-y-3">
                {activeAssignments.map((a: any) => {
                  const empName = a.employees?.users?.full_name || 'Unknown';
                  const isPresent = a.attendance?.some((att: any) => att.attendance_status === 'present');
                  const isLate = a.attendance?.some((att: any) => att.attendance_status === 'late');
                  const isAbsent = a.attendance?.some((att: any) => att.attendance_status === 'absent');
                  
                  const isPaid = a.payments?.some((p: any) => p.payment_status === 'paid');
                  const isPending = a.payments?.some((p: any) => p.payment_status === 'pending');
                  
                  return (
                    <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-white shadow-sm gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {empName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{empName}</p>
                          <p className="text-xs text-muted-foreground">{a.employees?.phone || 'No phone'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        {/* Attendance Badge */}
                        {isPresent ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 flex gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Present
                          </Badge>
                        ) : isLate ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 flex gap-1">
                            <Clock className="h-3 w-3" /> Late
                          </Badge>
                        ) : isAbsent ? (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 flex gap-1">
                            <XCircle className="h-3 w-3" /> Absent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Unmarked</Badge>
                        )}
                        
                        {/* Payment Badge */}
                        {isPaid ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Paid</Badge>
                        ) : isPending ? (
                          <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Pending Pay</Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Replacement / Removal History */}
          {removedAssignments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                Replacement History
              </h3>
              <div className="space-y-2">
                {removedAssignments.map((a: any) => {
                  const empName = a.employees?.users?.full_name || 'Unknown';
                  return (
                    <div key={a.id} className="p-3 border rounded-lg bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground line-through decoration-slate-400">
                          {empName}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {a.assignment_status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
