'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Calendar, Clock, Users, ArrowLeft, UserPlus, CheckCircle2, UserX, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { removeAssignment } from '@/app/actions/assignments';
import { markAttendance } from '@/app/actions/attendance';
import { BulkAssignModal } from '../bulk-assign-modal';

export function ShiftLedgerClient({ shift, isAdmin }: any) {
  const router = useRouter();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const assignments = shift.assignments || [];
  const activeAssignments = assignments.filter((a: any) => a.assignment_status !== 'removed');
  
  const handleRemove = async (id: string) => {
    const reason = prompt('Reason for removal:');
    if (reason) {
      await removeAssignment(id, reason);
    }
  };

  const handleAttendance = async (assignmentId: string, status: string) => {
    await markAttendance(assignmentId, status);
  };

  const shiftTemplate = Array.isArray(shift.shift_templates) ? shift.shift_templates[0] : shift.shift_templates;
  const branch = Array.isArray(shift.branches) ? shift.branches[0] : shift.branches;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/shift-schedule')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date</p>
            <p className="font-semibold text-foreground">
              {new Date(shift.shift_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Branch</p>
            <p className="font-semibold text-foreground">{branch?.name}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Shift Type</p>
            <p className="font-semibold text-foreground">{shift.shift_type}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Staff Fill</p>
            <p className="font-semibold text-foreground">
              {activeAssignments.length} / {shift.required_staff_count}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold">Assigned Staff</h2>
            <p className="text-sm text-muted-foreground">Manage employees working this shift</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsAssignModalOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Assign Staff
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Assignment Status</th>
                <th className="px-6 py-3 font-medium">Attendance</th>
                <th className="px-6 py-3 font-medium">Payment</th>
                {isAdmin && <th className="px-6 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No staff assigned to this shift yet.
                  </td>
                </tr>
              ) : (
                activeAssignments.map((assignment: any) => {
                  const emp = Array.isArray(assignment.employees) ? assignment.employees[0] : assignment.employees;
                  const att = Array.isArray(assignment.attendance) ? assignment.attendance[0] : assignment.attendance;
                  const pay = Array.isArray(assignment.payments) ? assignment.payments[0] : assignment.payments;
                  const empName = (Array.isArray(emp?.users) ? emp.users[0]?.full_name : emp?.users?.full_name) || 'N/A';

                  return (
                    <tr key={assignment.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{empName}</span>
                          <span className="text-xs text-muted-foreground">{emp?.employee_code} • {emp?.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={assignment.assignment_status === 'completed' ? 'default' : 'secondary'}>
                          {assignment.assignment_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isAdmin ? (
                          <div className="flex gap-1">
                            {(!att || att.attendance_status === 'absent') && (
                              <Button variant="outline" size="sm" className="h-7 px-2 text-green-600 border-green-200 bg-green-50 hover:bg-green-100" onClick={() => handleAttendance(assignment.id, 'present')}>
                                Mark Present
                              </Button>
                            )}
                            {(!att || att.attendance_status === 'present') && (
                              <Button variant="outline" size="sm" className="h-7 px-2 text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={() => handleAttendance(assignment.id, 'absent')}>
                                Mark Absent
                              </Button>
                            )}
                            {att && (
                              <Badge variant="outline" className={
                                att.attendance_status === 'present' ? 'text-green-700 bg-green-50 border-green-200' : 
                                att.attendance_status === 'absent' ? 'text-red-700 bg-red-50 border-red-200' : 'bg-slate-50'
                              }>
                                {att.attendance_status.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">{att?.attendance_status || 'PENDING'}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {pay ? (
                          <Badge variant={pay.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {pay.payment_status.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not generated</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 h-8 px-2"
                            onClick={() => handleRemove(assignment.id)}
                            disabled={assignment.assignment_status === 'completed'}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BulkAssignModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        shiftScheduleId={shift.id}
      />
    </div>
  );
}
