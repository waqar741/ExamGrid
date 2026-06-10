'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, Menu, User, LogOut } from 'lucide-react';
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
  const debouncedGlobalSearch = useDebounce(searchQuery, 400);
  
  // Create a nice title from the pathname
  const title = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';
  const displayTitle = title.charAt(0).toUpperCase() + title.slice(1);

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
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6 lg:h-[60px]">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar role={role} />
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
            <Button variant="ghost" className="relative h-9 w-auto px-3 rounded-md flex items-center gap-2.5 hover:bg-muted border border-border/50">
              <span className="h-6 w-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-[10px] font-bold">
                {email.charAt(0).toUpperCase()}
              </span>
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-semibold leading-none text-foreground">{role.replace('_', ' ').toUpperCase()}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{email}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1.5 bg-card">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => router.push('/dashboard/profile')}
              className="flex items-center gap-2 w-full cursor-pointer px-2 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 w-full cursor-pointer px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
