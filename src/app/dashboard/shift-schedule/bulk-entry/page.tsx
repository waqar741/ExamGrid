import { getAllBranches } from '@/app/actions/branches';
import { getEmployees } from '@/app/actions/employees';
import { BulkEntryClient } from './bulk-entry-client';

export const dynamic = 'force-dynamic';

export default async function BulkEntryPage() {
  const [branches, employeesRes] = await Promise.all([
    getAllBranches(),
    getEmployees({ pageSize: 1000 }) // get all active employees
  ]);

  return (
    <BulkEntryClient 
      branches={branches} 
      employees={employeesRes.data} 
    />
  );
}
