import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession, getSession } from '@/lib/auth';

const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next.js handle static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Handle public routes
  if (publicRoutes.includes(pathname)) {
    const session = await getSession();
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Handle root route
  if (pathname === '/') {
    const session = await getSession();
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle protected routes (everything else, specifically /dashboard)
  const session = await getSession();
  
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin and employee route restrictions
  if (session.role === 'employee') {
    if (pathname === '/dashboard/employees') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (pathname.startsWith('/dashboard/employees/')) {
      const targetUserId = pathname.split('/').pop();
      if (targetUserId !== session.userId) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    if (
      pathname.startsWith('/dashboard/branches') ||
      pathname.startsWith('/dashboard/reports') ||
      pathname.startsWith('/dashboard/audit-logs') ||
      pathname.startsWith('/dashboard/admin')
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Update session expiration
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
