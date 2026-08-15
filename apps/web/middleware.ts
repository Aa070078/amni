import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "amni_access";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/setup",
  "/settings",
  "/sales",
  "/purchasing",
  "/inventory",
  "/imports",
  "/finance",
  "/hrms",
  "/admin",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Server-side route guard. Redirects requests without a session cookie away
 * from authenticated routes to `/login?next=<path>`. One-directional only:
 * we never redirect an authed visitor away from `/login`/`/signup` because the
 * access cookie is httpOnly (the client cannot clear a stale token), so doing
 * so would create a redirect loop for expired sessions. Stale-token handling
 * stays client-side in `useMe` (401 → `/login`).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isProtected(pathname) && !request.cookies.get(ACCESS_COOKIE)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
