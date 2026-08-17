import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
const STORAGE_KEY = 'hourslot_user_session';

function isPublicBrowse(pathname: string): boolean {
  return (
    pathname === '/profile/explore' ||
    pathname.startsWith('/profile/explore/') ||
    pathname.startsWith('/profile/business/')
  );
}

function isProtectedApp(pathname: string): boolean {
  if (isPublicBrowse(pathname)) return false;
  return (
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/business' ||
    pathname.startsWith('/business/') ||
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

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

  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (isAuthenticated) {
      if (userRole === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      if (userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_STAFF') {
        return NextResponse.redirect(new URL('/business/dashboard', request.url));
      }
      const returnUrl = request.nextUrl.searchParams.get('returnUrl');
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        return NextResponse.redirect(new URL(returnUrl, request.url));
      }
      return NextResponse.redirect(new URL('/profile/explore', request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedApp(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnUrl', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith('/business') &&
      userRole !== 'BUSINESS_OWNER' &&
      userRole !== 'BUSINESS_STAFF') {
      return NextResponse.redirect(new URL('/profile/explore', request.url));
    }

    if (pathname.startsWith('/admin') && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/profile/explore', request.url));
    }

    if (pathname.startsWith('/profile') && userRole === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-hourslot.png|uploads).*)',
  ],
};
