import { getSession } from '@/lib/auth';
import { getAccountData } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { AccountClient } from './account-client';

export const metadata = {
  title: 'Account',
};

interface AccountPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, security settings, preferences, and login activity.
        </p>
      </div>

      <AccountClient 
        user={accountData.user}
        loginHistory={accountData.loginHistory}
        initialTab={initialTab}
      />
    </div>
  );
}
