import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // Redirect to the new unified Settings page
  redirect('/dashboard/settings?tab=preferences');
}
