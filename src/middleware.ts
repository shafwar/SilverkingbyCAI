import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // If accessing root path, explicitly bypass next-intl middleware
  // This prevents any locale detection or redirection
  // The root path will be handled by src/app/page.tsx which uses defaultLocale
  if (pathname === '/') {
    // Create a response that completely bypasses next-intl
    // Set locale header to default to prevent any client-side detection
    const response = NextResponse.next();
    response.headers.set('x-default-locale', routing.defaultLocale);
    return response;
  }
  
  // CRITICAL: Bypass next-intl for /verify routes
  // Verify page must be accessible without locale prefix for QR codes to work
  if (pathname.startsWith('/verify/')) {
    const response = NextResponse.next();
    response.headers.set('x-default-locale', routing.defaultLocale);
    return response;
  }
  
  // For all other paths, use next-intl middleware
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/admin`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  // - … the root path '/' (handled explicitly in middleware function)
  // - … the verify path '/verify' (handled explicitly for QR code compatibility)
  matcher: [
    '/((?!api|admin|_next|_vercel|verify|.*\\..*).*)'
  ]
};
