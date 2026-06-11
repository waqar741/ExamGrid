'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface EventDayModalProps {
  date: Date | null;
  events: any[];
  onClose: () => void;
  role: string;
}

export function EventDayModal({ date, events, onClose, role }: EventDayModalProps) {
  if (!date) return null;

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Events for {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events scheduled for this day.</p>
          ) : (
            events.map((ev) => {
              const allAssigned = ev.assignments || [];
              const validAssigned = allAssigned.filter((a: any) => a.assignment_status !== 'replaced' && a.assignment_status !== 'removed');
              const assignedCount = validAssigned.length;
              
              let presentCount = 0;
              let absentCount = 0;
              let lateCount = 0;
              let pendingPaymentAmount = 0;

              validAssigned.forEach((a: any) => {
                const attStatus = a.attendance?.[0]?.attendance_status;
                if (attStatus === 'present') presentCount++;
                if (attStatus === 'absent') absentCount++;
                if (attStatus === 'late') lateCount++;

                const payStatus = a.payments?.[0]?.payment_status;
                if (payStatus === 'pending') {
                  pendingPaymentAmount++; // Just counting pending payments
                }
              });

              return (
                <div key={ev.id} className="border rounded-md p-4 space-y-3 bg-muted/20">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{ev.branches?.name}</h3>
                    {role !== 'employee' && (
                      <Badge variant={assignedCount >= ev.required_staff_count ? 'default' : 'destructive'}>
                        {assignedCount} / {ev.required_staff_count} Staff
                      </Badge>
                    )}
                  </div>
                  
                  {role !== 'employee' ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Attendance Summary</span>
                        <div className="space-y-1">
                          <div className="flex justify-between"><span>Present:</span> <span className="font-medium">{presentCount}</span></div>
                          <div className="flex justify-between"><span>Late:</span> <span className="font-medium">{lateCount}</span></div>
                          <div className="flex justify-between"><span>Absent:</span> <span className="font-medium">{absentCount}</span></div>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Payment Summary</span>
                        <div className="space-y-1">
                          <div className="flex justify-between text-blue-600">
                            <span>Pending Records:</span> <span className="font-medium">{pendingPaymentAmount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2">
                        <span className="text-muted-foreground block mb-1">Request Status</span>
                        <Badge variant={
                          allAssigned[0]?.assignment_status === 'pending' ? 'outline' :
                          allAssigned[0]?.assignment_status === 'assigned' ? 'default' : 
                          allAssigned[0]?.assignment_status === 'removed' ? 'destructive' : 'secondary'
                        } className={allAssigned[0]?.assignment_status === 'pending' ? 'text-orange-600 border-orange-200 bg-orange-50' : ''}>
                          {allAssigned[0]?.assignment_status === 'pending' ? 'Pending Approval' : 
                           allAssigned[0]?.assignment_status === 'assigned' ? 'Approved' : 
                           allAssigned[0]?.assignment_status === 'removed' ? 'Rejected' : 'Completed'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Attendance Status</span>
                        <Badge variant={
                          presentCount > 0 ? 'default' :
                          lateCount > 0 ? 'secondary' :
                          absentCount > 0 ? 'destructive' : 'outline'
                        }>
                          {presentCount > 0 ? 'Present' :
                           lateCount > 0 ? 'Late' :
                           absentCount > 0 ? 'Absent' : 'Not Marked'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Payment Status</span>
                        <Badge variant={
                          pendingPaymentAmount > 0 ? 'secondary' : 'default'
                        }>
                          {pendingPaymentAmount > 0 ? 'Pending' : 'Settled/None'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
