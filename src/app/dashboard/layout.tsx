import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { supabase } from '@/lib/supabase';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: user } = await supabase.from('users').select('full_name').eq('id', session.userId).single();

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row md:h-screen md:overflow-hidden bg-gray-50/50">
      <div className="hidden md:flex">
        <Sidebar role={session.role} />
      </div>
      <div className="flex flex-1 flex-col w-full">
        <Header email={session.email} role={session.role} fullName={user?.full_name} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto md:overflow-y-auto w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
