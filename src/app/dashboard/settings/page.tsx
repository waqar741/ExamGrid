import { getSession } from '@/lib/auth';
import { getAccountData } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';

export const metadata = {
  title: 'Settings',
};

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const accountData = await getAccountData();
  if (!accountData) {
    redirect('/login');
  }

  const params = await searchParams;
  const initialTab = params.tab || 'personal';

  return (
    <div className="space-y-6 max-w-4xl">

      <SettingsClient 
        user={accountData.user}
        initialTab={initialTab}
      />
    </div>
  );
}
