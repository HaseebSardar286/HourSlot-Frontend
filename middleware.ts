import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/profile', '/business/dashboard', '/business/register', '/onboarding', '/admin'];
// Routes that redirect logged-in users away (auth pages)
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password'];

const STORAGE_KEY = 'hourslot_user_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the session from cookie (we also set one on login for middleware use)
  const sessionCookie = request.cookies.get(STORAGE_KEY)?.value;
  let isAuthenticated = false;
  let userRole: string | null = null;

  if (sessionCookie) {
    try {
      const session = JSON.parse(decodeURIComponent(sessionCookie));
      isAuthenticated = !!session?.token;
      userRole = session?.role ?? null;
    } catch {
      // ignore bad cookies
    }
  }

  // Redirect root to login
  if (pathname === '/') {
    if (isAuthenticated) {
      // Redirect based on role
      if (userRole === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      if (userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_STAFF') {
        return NextResponse.redirect(new URL('/business/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/profile', request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (isAuthenticated) {
      if (userRole === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      if (userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_STAFF') {
        return NextResponse.redirect(new URL('/business/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/profile', request.url));
    }
    return NextResponse.next();
  }

  // Enforce auth on protected routes
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based protection for business routes
    if (pathname.startsWith('/business/') &&
      userRole !== 'BUSINESS_OWNER' &&
      userRole !== 'BUSINESS_STAFF') {
      return NextResponse.redirect(new URL('/profile', request.url));
    }

    // Role-based protection for admin routes
    if (pathname.startsWith('/admin/') && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/profile', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|logo-hourslot.png).*)',
  ],
};
