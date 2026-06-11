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

      <PayRatesClient 
        initialData={payRates} 
        branches={branches}
      />
    </div>
  );
}
