import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // Redirect to the new unified Account page
  redirect('/dashboard/account?tab=preferences');
}
