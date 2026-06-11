'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { updateUserProfile, changeUserPassword, verifyCurrentPassword } from '@/app/actions/auth';
import { Lock, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettingsClientProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone: string;
    employee_code: string;
    last_login: string | null;
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'sessions'>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preferences Form State
  const [emailNotify, setEmailNotify] = useState(true);
  const [smsNotify, setSmsNotify] = useState(false);
  const [theme, setTheme] = useState('system');
  const [prefMessage, setPrefMessage] = useState<string | null>(null);

  // Verification State
  const [verifyAction, setVerifyAction] = useState<'profile' | 'password' | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    // Load local storage preferences if exist
    const storedEmail = localStorage.getItem('pref_email_notify');
    const storedSms = localStorage.getItem('pref_sms_notify');
    const storedTheme = localStorage.getItem('pref_theme');

    if (storedEmail !== null) setEmailNotify(storedEmail === 'true');
    if (storedSms !== null) setSmsNotify(storedSms === 'true');
    if (storedTheme !== null) setTheme(storedTheme);
  }, []);

  const executeProfileUpdate = async () => {
    setProfileLoading(true);
    setProfileMessage(null);

    const res = await updateUserProfile(fullName, phone, user.email);
    if (res?.error) {
      setProfileMessage({ type: 'error', text: res.error });
    } else {
      setProfileMessage({ type: 'success', text: 'Profile settings updated successfully.' });
    }
    setProfileLoading(false);
  };

  const handleUpdateProfileClick = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyAction('profile');
    setVerifyPassword('');
    setVerifyError('');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError('');
    
    const res = await verifyCurrentPassword(verifyPassword);
    if (res?.error) {
      setVerifyError(res.error);
      setVerifyLoading(false);
      return;
    }
    
    setVerifyLoading(false);
    
    if (verifyAction === 'profile') {
      setVerifyAction(null);
      await executeProfileUpdate();
    } else if (verifyAction === 'password') {
      setVerifyAction(null);
      await executeSecurityUpdate(verifyPassword);
    }
  };

  const handleUpdateSecurityClick = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setVerifyAction('password');
    setVerifyPassword('');
    setVerifyError('');
  };

  const executeSecurityUpdate = async (verifiedPassword: string) => {
    setSecurityLoading(true);
    setSecurityMessage(null);

    const formData = new FormData();
    formData.append('currentPassword', verifiedPassword);
    formData.append('newPassword', newPassword);
    formData.append('confirmPassword', confirmPassword);

    const res = await changeUserPassword(formData);
    if (res?.error) {
      setSecurityMessage({ type: 'error', text: res.error });
    } else {
      setSecurityMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSecurityLoading(false);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('pref_email_notify', String(emailNotify));
    localStorage.setItem('pref_sms_notify', String(smsNotify));
    localStorage.setItem('pref_theme', theme);
    setPrefMessage('Account preferences saved.');
    setTimeout(() => setPrefMessage(null), 3000);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Settings Navigation Sidebar */}
      <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1 border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-4">
        <button
          onClick={() => setActiveTab('profile')}
          className={`text-left px-3 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === 'profile'
              ? 'bg-[#0f172a] text-white'
              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          Profile Settings
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`text-left px-3 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === 'security'
              ? 'bg-[#0f172a] text-white'
              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          Security Settings
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`text-left px-3 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === 'preferences'
              ? 'bg-[#0f172a] text-white'
              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          Account Preferences
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`text-left px-3 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === 'sessions'
              ? 'bg-[#0f172a] text-white'
              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          Login Activity
        </button>
      </div>

      {/* Settings Action Content */}
      <div className="flex-1 max-w-2xl">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Profile Details</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure your public name and mobile information.</p>
            </div>
            {profileMessage && (
              <div className={`text-xs p-3 rounded-md font-medium ${
                profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-destructive/10 text-destructive'
              }`}>
                {profileMessage.text}
              </div>
            )}
            <form onSubmit={handleUpdateProfileClick} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
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
                  className="bg-muted/50 cursor-not-allowed text-muted-foreground border-border/80"
                />
              </div>

              {user.role === 'employee' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="emp_code">Employee Code</Label>
                    <Input
                      id="emp_code"
                      value={user.employee_code}
                      disabled
                      className="bg-muted/50 cursor-not-allowed text-muted-foreground border-border/80"
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
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label>Access Role</Label>
                  <div className="p-2.5 bg-muted rounded-md text-xs font-semibold uppercase text-muted-foreground border border-border/80">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={profileLoading} className="bg-[#0f172a] hover:bg-[#1e293b] text-white">
                {profileLoading ? 'Saving changes...' : 'Save Settings'}
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Change Password</h3>
              <p className="text-xs text-muted-foreground mt-1">Change your account login credentials. Password requirements apply.</p>
            </div>
            {securityMessage && (
              <div className={`text-xs p-3 rounded-md font-medium ${
                securityMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-destructive/10 text-destructive'
              }`}>
                {securityMessage.text}
              </div>
            )}
            <form onSubmit={handleUpdateSecurityClick} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={securityLoading} className="bg-[#0f172a] hover:bg-[#1e293b] text-white">
                {securityLoading ? 'Updating credentials...' : 'Update Password'}
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Account Preferences</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure layout theme styles and notification triggers.</p>
            </div>
            {prefMessage && (
              <div className="text-xs p-3 rounded-md font-medium bg-green-50 text-green-700 border border-green-200">
                {prefMessage}
              </div>
            )}
            <form onSubmit={handleSavePreferences} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notification Preferences</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={emailNotify}
                      onChange={(e) => setEmailNotify(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Email Notifications (Notify me of newly assigned shifts or payouts)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={smsNotify}
                      onChange={(e) => setSmsNotify(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>SMS Notifications (Notify me of emergency shift template reallocations)</span>
                  </label>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="theme">Theme Preference</Label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus:border-ring outline-none"
                >
                  <option value="system">System Default</option>
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>

              <Button type="submit" className="bg-[#0f172a] hover:bg-[#1e293b] text-white">Save Preferences</Button>
            </form>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Login Activity & Sessions</h3>
              <p className="text-xs text-muted-foreground mt-1">Review active system sessions and security protocols.</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="p-4 rounded-md border bg-muted/20">
                <span className="text-muted-foreground block mb-1.5 font-medium">Last Login Record</span>
                <span className="font-semibold">
                  {user.last_login ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm:ss') : 'First session active'}
                </span>
              </div>

              <div className="p-4 rounded-md border bg-muted/20">
                <span className="text-muted-foreground block mb-1.5 font-medium">Session Status</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <span className="font-bold text-green-600">Current Session Active</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border text-xs">
              <div className="bg-muted/40 px-4 py-2 font-medium border-b">Session Metadata</div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">JWT Signature Protocol:</span>
                  <span className="font-mono">HS256 encryption keys</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cookie Security Scope:</span>
                  <span>HTTPOnly, secure context rolling</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session Expiration Boundary:</span>
                  <span>24 hours absolute rolling limit</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Verification Modal */}
      <Dialog open={verifyAction !== null} onOpenChange={(open) => !open && setVerifyAction(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleVerify}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-500" />
                Verify Password
              </DialogTitle>
              <DialogDescription>
                Please enter your current password to verify your identity.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {verifyError && (
                <div className="p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20">
                  {verifyError}
                </div>
              )}
              <div className="grid gap-2">
                <Input
                  id="verifyPasswordAdmin"
                  type="password"
                  placeholder="Current Password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  className="border-emerald-500 focus-visible:ring-emerald-500"
                  required
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setVerifyAction(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={verifyLoading} className="bg-emerald-500 hover:bg-emerald-600">
                {verifyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
