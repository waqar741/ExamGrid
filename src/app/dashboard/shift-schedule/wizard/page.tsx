import { getAllBranches } from '@/app/actions/branches';
import { getEmployees } from '@/app/actions/employees';
import { WizardClient } from './wizard-client';

export const dynamic = 'force-dynamic';

export default async function WizardPage() {
  const [branches, employeesRes] = await Promise.all([
    getAllBranches(),
    getEmployees({ pageSize: 1000 })
  ]);

  return (
    <WizardClient 
      branches={branches} 
      employees={employeesRes.data.filter((e: any) => e.status === 'active' && e.is_active)} 
    />
  );
}
