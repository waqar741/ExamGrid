import { getShifts } from '@/app/actions/shifts';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateShiftModal } from './create-shift-modal';
import Link from 'next/link';

export default async function ShiftsPage() {
  const shifts = await getShifts();
  const session = await getSession();
  const isAdmin = session?.role !== 'employee';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shift Templates</h2>
          <p className="text-muted-foreground">
            Manage reusable shift timings
          </p>
        </div>
        {isAdmin && <CreateShiftModal />}
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shift Name</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No shift templates found.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.start_time.slice(0, 5)}</TableCell>
                  <TableCell>{shift.end_time.slice(0, 5)}</TableCell>
                  <TableCell>
                    {shift.is_active ? 'Active' : 'Inactive'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/shifts/${shift.id}`}>
                      <Button variant="ghost" size="sm">
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
        {shifts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground border rounded-md bg-card">No shift templates found.</div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="flex flex-col gap-2 p-4 border rounded-md bg-card">
              <div className="flex justify-between items-start">
                <div className="font-semibold text-lg">{shift.name}</div>
                <div className={`text-sm px-2 py-1 rounded-md ${shift.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {shift.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
              </div>
              <div className="mt-2">
                <Link href={`/dashboard/shifts/${shift.id}`}>
                  <Button variant="outline" size="sm" className="w-full">View Details</Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
