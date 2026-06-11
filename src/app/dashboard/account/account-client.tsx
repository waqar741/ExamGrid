'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Lock, Shield, Palette, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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

interface AccountClientProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone: string;
    employee_code: string;
    last_login: string | null;
    created_at: string;
  };
  loginHistory: any[];
  initialTab?: string;
}

export function AccountClient({ user, loginHistory, initialTab = 'personal' }: AccountClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Personal Information State
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change State
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Preferences State
  const [emailNotifications, setEmailNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('emailNotifications') !== 'false';
    }
    return true;
  });
  const [smsNotifications, setSmsNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smsNotifications') !== 'false';
    }
    return false;
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'auto';
    }
    return 'auto';
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/dashboard/account?tab=${tabId}`);
  };

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

  const handlePreferenceChange = (key: string, value: any) => {
    if (key === 'emailNotifications') {
      setEmailNotifications(value);
      localStorage.setItem('emailNotifications', String(value));
    } else if (key === 'smsNotifications') {
      setSmsNotifications(value);
      localStorage.setItem('smsNotifications', String(value));
    } else if (key === 'theme') {
      setTheme(value);
      localStorage.setItem('theme', value);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'session', label: 'Session & Activity', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#0f172a] text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Personal Information Tab */}
      {activeTab === 'personal' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Your phone number"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    type="text"
                    value={user.role.replace('_', ' ').toUpperCase()}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {user.employee_code && (
                <div className="space-y-2">
                  <Label htmlFor="empCode">Employee Code</Label>
                  <Input
                    id="empCode"
                    type="text"
                    value={user.employee_code}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="submit"
                  disabled={profileLoading}
                  className="bg-[#0f172a] hover:bg-[#1e293b]"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Change Password
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Update your password to keep your account secure.
                </p>
              </div>
              <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your current password and choose a new one.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    {passwordError && (
                      <div className="p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20">
                        {passwordError}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        placeholder="Enter current password"
                        required
                      />
                    </div>
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
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={passwordLoading} className="bg-[#0f172a]">
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
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              Account Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">Account Status</span>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">Account Created</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <Card className="p-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-primary" />
              Preferences
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3">Notifications</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-md cursor-pointer hover:bg-muted/70 transition">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive important updates via email</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-md cursor-pointer hover:bg-muted/70 transition">
                    <input
                      type="checkbox"
                      checked={smsNotifications}
                      onChange={(e) => handlePreferenceChange('smsNotifications', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">SMS Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive alerts via SMS</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold mb-3">Theme</h4>
                <div className="space-y-2">
                  <select
                    value={theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Choose your preferred interface theme</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Session & Activity Tab */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              Session Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">Last Login</span>
                <span className="text-sm text-muted-foreground">
                  {user.last_login ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm') : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">Current Status</span>
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Login History</h3>
            {loginHistory && loginHistory.length > 0 ? (
              <div className="space-y-2">
                {loginHistory.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Login Successful</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <AlertCircle className="h-4 w-4 mr-2" />
                No login history available
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
