import { getSession } from '@/lib/auth';
import { getCurrentUser } from '@/app/actions/auth';
import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { ProfileClient } from './profile-client';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch recent audit logs for the current user
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
        <p className="text-muted-foreground">
          Manage your personal information, security credentials, and login history.
        </p>
      </div>

      <ProfileClient user={user} logs={logs || []} />
    </div>
  );
}
