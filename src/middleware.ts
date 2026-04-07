import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for access token cookie
  const accessToken = request.cookies.get('access_token')?.value;

  if (accessToken) {
    try {
      // Verify token is valid
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'dev-secret-change-in-production'
      );
      await jwtVerify(accessToken, secret);

      // Authenticated user on /login → redirect to /
      if (pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      return NextResponse.next();
    } catch {
      // Token invalid/expired — fall through to redirect
    }
  }

  // Unauthenticated user trying to access protected route → redirect to /login
  if (pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
