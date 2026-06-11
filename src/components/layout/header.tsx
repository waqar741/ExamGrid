'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, Menu, User, LogOut, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logout } from '@/app/actions/auth';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDebounce } from '@/lib/use-debounce';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/layout/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  email: string;
  role: string;
}

export function Header({ email, role }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const debouncedGlobalSearch = useDebounce(searchQuery, 400);
  
  const title = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';
  let displayTitle = title.charAt(0).toUpperCase() + title.slice(1);
  if (pathname === '/dashboard/admin/users') {
    displayTitle = 'Admin Management';
  }

  useEffect(() => {
    if (debouncedGlobalSearch.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(debouncedGlobalSearch.trim())}`);
    }
  }, [debouncedGlobalSearch, router]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (e) {
      // ignore redirect error if thrown
    }
    window.location.href = '/login';
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6 lg:h-[60px]">
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar role={role} onClose={() => setIsSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        <h1 className="text-lg font-semibold">{displayTitle}</h1>
      </div>
      <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {role !== 'employee' && (
          <form onSubmit={onSubmitSearch} className="relative hidden md:flex items-center">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search employees, branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </form>
        )}
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-auto px-3 rounded-md flex items-center gap-3 hover:bg-muted border-none">
              <span className="h-8 w-8 rounded-md bg-[#1e293b] text-white flex items-center justify-center text-sm font-medium">
                {email.charAt(0).toUpperCase()}
              </span>
              <div className="text-left hidden sm:block">
                <p className="text-[13px] font-medium leading-none text-[#1e293b]">{role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}</p>
                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">{role.toUpperCase()}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 mt-2 p-1.5 bg-white rounded-lg border shadow-sm">
            <DropdownMenuItem 
              onClick={() => router.push('/dashboard/settings?tab=personal')}
              className="flex items-center gap-3 w-full cursor-pointer px-3 py-2.5 text-[13px] font-medium text-[#334155] hover:bg-slate-50 rounded-md focus:bg-slate-50"
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-1.5" />
            
            <DropdownMenuItem 
              onClick={handleSignOut} 
              className="flex items-center gap-3 w-full cursor-pointer px-3 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md focus:bg-red-50 focus:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
