import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

/**
 * Public routes — always accessible without an active session.
 */
const PUBLIC_ROUTES = [
  "/login",
  "/reset-password",
  "/update-password",
  "/auth/callback",
];

const STATIC_OR_API_PREFIXES = [
  "/_next",
  "/favicon",
  "/images",
  "/assets",
  "/api/",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return false;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isSkippablePath(pathname: string) {
  return STATIC_OR_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isSkippablePath(pathname)) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);

  // IMPORTANT: per Supabase docs, use getUser() (not getSession()) in middleware
  // because it re-validates the JWT against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = isPublicPath(pathname);
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuspendedPage = pathname === "/account-sospeso";
  const isOnboardingPage = pathname === "/onboarding";

  // 1. Unauthenticated users → /login (except on public routes)
  if (!user) {
    if (isPublic) return response();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated: load profile + tenant from DB (don't trust JWT claims)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, tenant_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    // orphaned auth row or deactivated profile → sign out and bounce to login
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "account_disabled");
    return NextResponse.redirect(url);
  }

  const isSuperAdmin = profile.role === "super_admin";

  // 3. If on /login while logged in → route to the correct home
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = isSuperAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // 4. Super admin: full access to /admin, block /onboarding and /dashboard
  if (isSuperAdmin) {
    if (pathname === "/" || pathname === "/dashboard" || isOnboardingPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return response();
  }

  // 5. Tenant users cannot access /admin/*
  if (isAdminRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 6. Fetch tenant status/onboarding
  if (!profile.tenant_id) {
    // non-super-admin without tenant — invalid state
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "no_tenant");
    return NextResponse.redirect(url);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, status, onboarding_completed")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  if (!tenant) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "tenant_missing");
    return NextResponse.redirect(url);
  }

  // 7. Suspended tenant → /account-sospeso
  if (tenant.status === "suspended") {
    if (!isSuspendedPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/account-sospeso";
      return NextResponse.redirect(url);
    }
    return response();
  }

  // Active tenants shouldn't sit on /account-sospeso
  if (isSuspendedPage && tenant.status !== "suspended") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 8. Onboarding not completed → /onboarding
  if (!tenant.onboarding_completed && !isOnboardingPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // 9. If onboarding is done and user goes to /onboarding → dashboard
  if (tenant.onboarding_completed && isOnboardingPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 10. Root → dashboard
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public image/assets
     * Feel free to tweak.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
