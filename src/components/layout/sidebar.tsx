'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  CalendarDays, 
  ClipboardList, 
  Users, 
  Building2, 
  Clock, 
  CheckSquare, 
  CreditCard, 
  BarChart3, 
  ShieldAlert,
  Settings,
  Shield,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/app/actions/auth';

interface SidebarProps {
  role: string;
  onClose?: () => void;
}

export function Sidebar({ role, onClose }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Shift Schedule', href: '/dashboard/shift-schedule', icon: CalendarDays },
    { name: 'Employees', href: '/dashboard/employees', icon: Users, adminOnly: true },
  ];

  const manageNav = [
    { name: 'Assignments', href: '/dashboard/assignments', icon: ClipboardList, adminOnly: true },
    { name: 'Branches', href: '/dashboard/branches', icon: Building2, adminOnly: true },
    { name: 'Pay Rates', href: '/dashboard/pay-rates', icon: CreditCard, adminOnly: true },
    { name: 'Attendance', href: '/dashboard/attendance', icon: CheckSquare },
    { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, adminOnly: true },
  ];

  const systemNav = [
    { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: ShieldAlert, superAdminOnly: true },
    { name: 'Admin Management', href: '/dashboard/admin/users', icon: Shield, superAdminOnly: true },
    { name: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
    { name: 'Profile', href: '/dashboard/profile', icon: Users },
  ];

  const filterNav = (items: any[]) => {
    return items.filter(item => {
      if (item.superAdminOnly && role !== 'super_admin') return false;
      if (item.adminOnly && role === 'employee') return false;
      return true;
    });
  };

  const activeLinkClass = "bg-[#0f172a] text-white font-medium hover:bg-[#1e293b] hover:text-white";
  const inactiveLinkClass = "text-muted-foreground hover:text-foreground hover:bg-muted/80";

  const renderNavSection = (title: string, items: any[]) => {
    const visibleItems = filterNav(items);
    if (visibleItems.length === 0) return null;

    return (
      <div className="space-y-1.5">
        <h4 className="px-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none">
          {title}
        </h4>
        <nav className="grid gap-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition-all",
                  isActive ? activeLinkClass : inactiveLinkClass
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-sm font-bold tracking-tight text-primary flex items-center gap-2">
          <span className="h-5 w-5 bg-[#0f172a] rounded flex items-center justify-center text-white text-[10px]">SG</span>
          ExamGrid
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {renderNavSection('Main', mainNav)}
        {renderNavSection('Manage', manageNav)}
        {renderNavSection('System', systemNav)}
      </div>

      <div className="border-t p-3">
        <form action={logout}>
          <button 
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-medium transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </form>
      </div>
    </div>
  );
}
