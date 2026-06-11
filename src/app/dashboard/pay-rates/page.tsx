import { getPayRates } from '@/app/actions/pay-rates';
import { getAllBranches } from '@/app/actions/branches';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PayRatesClient } from './pay-rates-client';

export default async function PayRatesPage() {
  const session = await getSession();
  if (session?.role === 'employee') {
    redirect('/dashboard');
  }

  const payRates = await getPayRates();
  const branches = await getAllBranches();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Branch Pay Rates</h2>
        <p className="text-muted-foreground">
          Manage shift payment rates across branches.
        </p>
      </div>

      <PayRatesClient 
        initialData={payRates} 
        branches={branches}
      />
    </div>
  );
}
