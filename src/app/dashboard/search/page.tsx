import { globalSearch } from '@/app/actions/search';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await getSession();
  if (!session || session.role === 'employee') {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const query = (resolvedParams.q as string) || '';
  const results = await globalSearch(query) as any;

  const totalResults = results.employees.length + results.branches.length + results.events.length;

  return (
    <div className="space-y-6">

      {totalResults === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          No records found matching your query.
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Employees Results */}
          {results.employees.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2">Employees ({results.employees.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.employees.map((emp: any) => (
                  <div key={emp.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                    <h4 className="font-semibold text-primary">{emp.users?.full_name}</h4>
                    <p className="text-sm text-muted-foreground">Code: {emp.employee_code}</p>
                    <p className="text-sm text-muted-foreground">Email: {emp.users?.email}</p>
                    <p className="text-sm text-muted-foreground">Phone: {emp.phone}</p>
                    <div className="pt-2">
                      <Link href={`/dashboard/employees/${emp.id}`}>
                        <Button variant="outline" size="sm">View Profile</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branches Results */}
          {results.branches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2">Branches ({results.branches.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.branches.map((b: any) => (
                  <div key={b.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                    <h4 className="font-semibold text-primary">{b.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{b.description || 'No description'}</p>
                    <div className="pt-2">
                      <Link href={`/dashboard/branches/${b.id}`}>
                        <Button variant="outline" size="sm">View Branch</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events Results */}
          {results.events.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2">Events ({results.events.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.events.map((ev: any) => (
                  <div key={ev.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                    <h4 className="font-semibold text-primary">{ev.branches?.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Date: {format(new Date(ev.event_date), 'MMM d, yyyy')}
                    </p>
                    {ev.notes && <p className="text-sm text-muted-foreground line-clamp-2">{ev.notes}</p>}
                    <div className="pt-2">
                      <Link href={`/dashboard/events/${ev.id}`}>
                        <Button variant="outline" size="sm">View Event</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
