import { getSession } from '@/lib/auth';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-muted-foreground">
          Manage your personal details, preferences, security, and sessions.
        </p>
      </div>

      <div className="rounded-md border bg-card p-6 shadow-sm">
        <SettingsClient user={user} />
      </div>
    </div>
  );
}
