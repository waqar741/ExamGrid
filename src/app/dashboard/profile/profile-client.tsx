'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { updateUserProfile, changeUserPassword } from '@/app/actions/auth';

interface ProfileClientProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone: string;
    employee_code: string;
    last_login: string | null;
  };
  logs: any[];
}

export function ProfileClient({ user, logs }: ProfileClientProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);

    const res = await updateUserProfile(fullName, phone);
    if (res?.error) {
      setProfileMessage({ type: 'error', text: res.error });
    } else {
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
    }
    setProfileLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');

    const formData = new FormData(e.currentTarget);
    const res = await changeUserPassword(formData);

    if (res?.error) {
      setPasswordError(res.error);
      setPasswordLoading(false);
    } else {
      setPasswordOpen(false);
      setPasswordLoading(false);
      alert('Password updated successfully.');
    }
  };

  return (
    <div className="grid gap-6">
      {/* Personal Info Card */}
      <div className="rounded-md border bg-card shadow-xs">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
            <p className="text-xs text-muted-foreground mt-0.5">View and update your personal details.</p>
          </div>
          <Button 
            form="profile-form" 
            type="submit" 
            disabled={profileLoading} 
            size="sm" 
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
          >
            {profileLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        <div className="p-6">
          {profileMessage && (
            <div className={`text-xs p-3 rounded-md mb-4 font-medium ${
              profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-destructive/10 text-destructive'
            }`}>
              {profileMessage.text}
            </div>
          )}

          <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {user.role === 'employee' ? (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="employee_code">Employee Code</Label>
                    <Input
                      id="employee_code"
                      value={user.employee_code}
                      disabled
                      className="bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter mobile number"
                    />
                  </div>
                </>
              ) : (
                <div className="grid gap-1.5">
                  <Label>Role</Label>
                  <div className="p-2.5 bg-muted rounded-md text-xs font-semibold uppercase text-muted-foreground border">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Security Card */}
      <div className="rounded-md border bg-card shadow-xs p-6 space-y-4">
        <div className="border-b pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Security</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Manage your account security credentials.</p>
          </div>
          <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Change Password</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handlePasswordChange}>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Update your account login password. You will be required to re-authenticate.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {passwordError && (
                    <div className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-md">
                      {passwordError}
                    </div>
                  )}

                  <div className="grid gap-1.5">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)} disabled={passwordLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={passwordLoading} className="bg-[#0f172a] hover:bg-[#1e293b] text-white">
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="p-3 bg-muted/40 rounded-md border">
            <span className="text-muted-foreground block mb-1">Password Status</span>
            <span className="font-semibold text-green-600">Last updated recently</span>
          </div>
          <div className="p-3 bg-muted/40 rounded-md border">
            <span className="text-muted-foreground block mb-1">Session Security</span>
            <span className="font-mono text-muted-foreground">HS256 JWT Signed Cookie</span>
          </div>
        </div>
      </div>

      {/* Login History */}
      <div className="rounded-md border bg-card shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground border-b pb-2">Login History & Sessions</h3>
        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="p-3 bg-muted/40 rounded-md border">
            <span className="text-muted-foreground block mb-1">Last Login Time</span>
            <span className="font-medium">
              {user.last_login ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm:ss') : 'N/A'}
            </span>
          </div>
          <div className="p-3 bg-muted/40 rounded-md border">
            <span className="text-muted-foreground block mb-1">Active Session State</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span className="font-semibold text-green-600">Current Session Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="rounded-md border bg-card shadow-xs">
        <h3 className="text-sm font-semibold text-foreground border-b px-6 py-4">Recent Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b text-muted-foreground font-medium">
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Module</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">
                    No recent activity logged.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20">
                    <td className="px-6 py-3 text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-3 font-mono">{log.entity_type}</td>
                    <td className="px-6 py-3">
                      <Badge variant={
                        log.action === 'CREATE' ? 'default' :
                        log.action === 'UPDATE' ? 'secondary' : 'destructive'
                      }>
                        {log.action}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
