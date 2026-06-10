import { getSession } from '@/lib/auth';
import { getDashboardMetrics } from '@/app/actions/dashboard';
import { format } from 'date-fns';

export default async function DashboardPage() {
  const session = await getSession();
  const metrics = await getDashboardMetrics();
  if (!metrics) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Failed to load dashboard metrics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Events Today</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{metrics.eventsToday}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Assigned Staff</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{metrics.assignedStaff}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Pending Payments</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">₹{metrics.pendingPayments}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-destructive">Staff Shortages</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-destructive">{metrics.staffShortages}</div>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="rounded-xl border bg-card text-card-foreground shadow col-span-1 md:col-span-2 lg:col-span-4">
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="font-semibold leading-none tracking-tight">Upcoming Events</h3>
          </div>
          <div className="p-0">
            {metrics.upcomingEvents.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No upcoming events found.</div>
            ) : (
              <div className="divide-y">
                {metrics.upcomingEvents.map((ev: any) => {
                  const assigned = ev.assignments?.length || 0;
                  const shortage = ev.required_staff_count > assigned;
                  return (
                    <div key={ev.id} className="flex items-center justify-between p-4 px-6">
                      <div>
                        <p className="font-medium">{ev.branches?.name}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(ev.event_date), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {assigned} / {ev.required_staff_count} Staff
                        </p>
                        {shortage && (
                          <span className="text-xs text-destructive">Shortage</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow col-span-1 md:col-span-2 lg:col-span-3">
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="font-semibold leading-none tracking-tight">Recent Activity</h3>
          </div>
          <div className="p-0">
            {metrics.recentActivity.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No recent activity.</div>
            ) : (
              <div className="divide-y">
                {metrics.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="p-4 px-6 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.users?.full_name}</span>
                      {' '}
                      {activity.action_type === 'assigned' ? 'assigned' : 'replaced'}
                      {' '}
                      <span className="font-medium">{activity.employees?.users?.full_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
