import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Check for auth session cookie
  // Firebase Auth or client can set session indicators, or fallback to client-side auth state
  const session = request.cookies.get("__session")?.value;

  // We allow next/static, api, etc. if not matched
  // In Next.js 16 proxy runs on matched paths
  if (!session && !publicRoutes.includes(pathname)) {
    // Note: When using client-side auth state exclusively, proxy can optionally pass through or redirect if cookie is set.
    // To allow full client-side token management while still guarding direct access:
    // If you use cookie session:
    // const loginUrl = new URL("/login", request.url);
    // loginUrl.searchParams.set("redirect", pathname);
    // return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect all role dashboard routes
  matcher: [
    "/super-admin/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
  ],
};
