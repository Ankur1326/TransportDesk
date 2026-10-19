import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Route guard.
 *
 *  - Marketing pages and /api/auth/* are public.
 *  - /sign-in and /sign-up bounce already-signed-in users to the dashboard.
 *  - /admin/*, /user/* and the private APIs require a valid, approved session.
 *    Pages redirect to /sign-in (remembering where the person was going);
 *    APIs answer with JSON 401/403 instead of a redirect.
 *
 * NextAuth's getToken() returns null for expired tokens, so no manual expiry
 * check is needed.
 */

const AUTH_PAGES = ["/sign-in", "/sign-up"];
const PRIVATE_PAGE_PREFIXES = ["/admin", "/user"];
const PRIVATE_API_PREFIXES = ["/api/admin", "/api/profile", "/api/user"];

const DASHBOARD = "/admin/dashboard";

const startsWithAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isSignedIn = Boolean(token?._id);
  const isApproved = isSignedIn && token?.isApproved !== false && token?.role === "transporter";

  // --- Auth pages -------------------------------------------------------
  if (startsWithAny(pathname, AUTH_PAGES)) {
    if (isApproved) return NextResponse.redirect(new URL(DASHBOARD, request.url));
    return NextResponse.next();
  }

  // --- Private APIs -----------------------------------------------------
  if (startsWithAny(pathname, PRIVATE_API_PREFIXES)) {
    if (!isSignedIn) {
      return NextResponse.json({ success: false, message: "Unauthorized request, please sign in" }, { status: 401 });
    }
    if (!isApproved) {
      return NextResponse.json({ success: false, message: "Account approval is required" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // --- Private pages ----------------------------------------------------
  if (startsWithAny(pathname, PRIVATE_PAGE_PREFIXES)) {
    if (!isSignedIn) {
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(signIn);
    }
    if (!isApproved) {
      return NextResponse.redirect(new URL("/sign-in?error=AccountNotApproved", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/sign-in",
    "/sign-up",
    "/admin/:path*",
    "/user/:path*",
    "/api/admin/:path*",
    "/api/profile/:path*",
    "/api/user/:path*",
  ],
};
