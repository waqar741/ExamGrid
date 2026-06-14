'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Lock, Shield, Palette, CheckCircle2, Loader2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { updateUserProfile, changeUserPassword, verifyCurrentPassword } from '@/app/actions/auth';


interface SettingsClientProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone: string;
    employee_code: string;
    created_at: string;
  };
  initialTab?: string;
}

export function SettingsClient({ user, initialTab = 'personal' }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Personal Information State
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Verification State
  const [verifyAction, setVerifyAction] = useState<'profile' | 'password' | 'email' | 'phone' | 'fullName' | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [newValue, setNewValue] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  
  // Preferences State
  const [emailNotifications, setEmailNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('emailNotifications') !== 'false';
    }
    return true;
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'auto';
    }
    return 'auto';
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/dashboard/settings?tab=${tabId}`);
  };

  const executeProfileUpdate = async (newName: string, newPhone: string, newEmail: string) => {
    setProfileLoading(true);
    setProfileMessage(null);

    const res = await updateUserProfile(newName, newPhone, newEmail);
    if (res?.error) {
      setProfileMessage({ type: 'error', text: res.error });
    } else {
      setFullName(newName);
      setPhone(newPhone);
      setEmail(newEmail);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
    }
    setProfileLoading(false);
  };

  const handleChangeClick = (field: 'email' | 'phone' | 'fullName') => {
    setVerifyAction(field);
    setVerifyPassword('');
    setVerifyError('');
    if (field === 'email') setNewValue(email);
    if (field === 'phone') setNewValue(phone || '');
    if (field === 'fullName') setNewValue(fullName);
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
    
    if (verifyAction === 'password') {
      setVerifyAction(null);
      setPasswordOpen(true);
    } else if (verifyAction) {
      const field = verifyAction;
      setVerifyAction(null);
      
      let updatedName = fullName;
      let updatedPhone = phone;
      let updatedEmail = email;

      if (field === 'fullName') updatedName = newValue;
      if (field === 'phone') updatedPhone = newValue;
      if (field === 'email') updatedEmail = newValue;

      await executeProfileUpdate(updatedName, updatedPhone, updatedEmail);
    }
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

  const handlePreferenceChange = (key: string, value: any) => {
    if (key === 'emailNotifications') {
      setEmailNotifications(value);
      localStorage.setItem('emailNotifications', String(value));
    } else if (key === 'theme') {
      setTheme(value);
      localStorage.setItem('theme', value);
    }
  };
  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'security', label: 'Security & Access', icon: Lock },
    { id: 'preferences', label: 'System Preferences', icon: Palette },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex flex-col gap-1 bg-card rounded-xl border p-2 shadow-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <tab.icon className={`h-4 w-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full bg-card rounded-xl border shadow-sm">
        {/* Personal Information Tab */}
        {activeTab === 'personal' && (
          <div className="p-6">
            <h3 className="text-lg font-bold tracking-tight mb-6">Personal Information</h3>
            <div className="space-y-6">
              {profileMessage && (
                <div
                  className={`p-3 rounded-md text-sm font-medium ${
                    profileMessage.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="flex gap-2">
                    <Input value={fullName} disabled className="bg-slate-50 text-slate-500 font-medium" />
                    <Button type="button" variant="outline" onClick={() => handleChangeClick('fullName')}>Change</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex gap-2">
                    <Input value={phone || 'No phone'} disabled className="bg-slate-50 text-slate-500 font-medium" />
                    <Button type="button" variant="outline" onClick={() => handleChangeClick('phone')}>Change</Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex gap-2">
                    <Input value={email} disabled className="bg-slate-50 text-slate-500 font-medium" />
                    <Button type="button" variant="outline" onClick={() => handleChangeClick('email')}>Change</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex h-10 w-full items-center px-3 rounded-md border bg-slate-50 text-sm text-slate-500 font-medium">
                    <span className="capitalize">{user.role.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {user.employee_code && (
                <div className="space-y-2 max-w-[calc(50%-12px)]">
                  <Label>Employee Code</Label>
                  <Input
                    value={user.employee_code}
                    disabled
                    className="bg-slate-50 text-slate-500 font-medium"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="divide-y">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Lock className="h-5 w-5 text-slate-700" />
                  Change Password
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Update your password to keep your account secure.
                </p>
              </div>
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setVerifyAction('password');
                    setVerifyPassword('');
                    setVerifyError('');
                  }}
                >
                  Change Password
                </Button>
              </div>
              <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your current password and choose a new one.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordChange} className="space-y-4 pt-2">
                    {passwordError && (
                      <div className="p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20">
                        {passwordError}
                      </div>
                    )}
                    <input type="hidden" name="currentPassword" value={verifyPassword} />
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={passwordLoading}>
                        {passwordLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-slate-700" />
                Account Status
              </h3>
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-sm font-medium text-slate-700">Account Access</span>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-sm font-medium text-slate-700">Member Since</span>
                  <span className="text-sm text-slate-600 font-medium">
                    {format(new Date(user.created_at), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="p-6">
            <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-6">
              <Palette className="h-5 w-5 text-slate-700" />
              System Preferences
            </h3>
            
            <div className="space-y-8 max-w-xl">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Notifications</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Email Notifications</p>
                      <p className="text-xs text-slate-500 mt-0.5">Receive important schedule updates via email</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Appearance</h4>
                <div className="space-y-2">
                  <select
                    value={theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="auto">System Default</option>
                  </select>
                  <p className="text-xs text-slate-500">Choose your preferred interface theme for the dashboard.</p>
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
                {verifyAction === 'password' ? 'Verify Password' : 'Secure Change'}
              </DialogTitle>
              <DialogDescription>
                {verifyAction === 'password' 
                  ? 'Please enter your current password to verify your identity.' 
                  : 'Please enter your current password and the new value to securely update your profile.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {verifyError && (
                <div className="p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20">
                  {verifyError}
                </div>
              )}
              
              {verifyAction !== 'password' && (
                <div className="grid gap-2">
                  <Label htmlFor="newValue" className="font-semibold text-slate-700">
                    New {verifyAction === 'fullName' ? 'Full Name' : verifyAction === 'phone' ? 'Phone Number' : 'Email Address'}
                  </Label>
                  <Input
                    id="newValue"
                    type={verifyAction === 'email' ? 'email' : verifyAction === 'phone' ? 'tel' : 'text'}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid gap-2 mt-2">
                <Label htmlFor="verifyPassword">Current Password</Label>
                <Input
                  id="verifyPassword"
                  type="password"
                  placeholder="Enter your password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  className="border-emerald-500 focus-visible:ring-emerald-500"
                  required
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
