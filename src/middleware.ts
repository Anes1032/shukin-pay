import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const { pathname } = request.nextUrl;

    // Protect dashboard routes
    if (pathname.startsWith('/dashboard')) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // Redirect logged-in users from login page to dashboard
    if (pathname === '/login') {
        if (token) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    // Handle legacy /admin routes - redirect to new paths
    if (pathname.startsWith('/admin')) {
        if (pathname === '/admin/login') {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        if (pathname.startsWith('/admin/dashboard') || pathname === '/admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/admin/:path*'],
};
