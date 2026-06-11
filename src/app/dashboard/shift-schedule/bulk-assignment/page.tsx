import { getAllBranches } from '@/app/actions/branches';
import { getAllEmployees } from '@/app/actions/employees';
import { BulkAssignmentClient } from './bulk-assignment-client';

export const metadata = {
  title: 'Bulk Assignment',
};

export default async function BulkAssignmentPage() {
  const branches = await getAllBranches();
  const employees = await getAllEmployees();

  return (
    <div className="space-y-6 max-w-6xl">

      <BulkAssignmentClient branches={branches} employees={employees} />
    </div>
  );
}
