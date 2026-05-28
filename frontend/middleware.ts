import { NextResponse, type NextRequest } from "next/server";

/**
 * Public routes — always accessible without an active session.
 */
const PUBLIC_ROUTES = [
  "/login",
  "/reset-password",
  "/update-password",
];

const STATIC_OR_API_PREFIXES = [
  "/api",
  "/_next",
  "/favicon",
  "/images",
  "/assets",
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

function getGatewayUrl(): string {
  return process.env.GATEWAY_URL ?? "http://localhost:8080";
}

async function verifyToken(token: string): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
  try {
    const res = await fetch(`${getGatewayUrl()}/api/auth/verify`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { valid: false };
    const data = await res.json() as { valid?: boolean; payload?: Record<string, unknown>; user?: Record<string, unknown> };
    return { valid: data.valid === true, payload: data.payload ?? data.user };
  } catch {
    return { valid: false };
  }
}

async function fetchTenantStatus(token: string, tenantId: string): Promise<{
  status: string;
  onboarding_completed: boolean;
  plan_expires_at: string | null;
} | null> {
  try {
    const res = await fetch(`${getGatewayUrl()}/api/tenants/${tenantId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json() as { status: string; onboarding_completed: boolean; plan_expires_at: string | null };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isSkippablePath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value ?? null;

  const isPublic = isPublicPath(pathname);
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuspendedPage = pathname === "/account-sospeso";
  const isOnboardingPage = pathname === "/onboarding";

  // 1. Unauthenticated users → /login (except on public routes)
  if (!token) {
    if (isPublic) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Validate JWT against auth-service
  const { valid, payload } = await verifyToken(token);

  if (!valid || !payload) {
    if (isPublic) {
      const res = NextResponse.next();
      res.cookies.delete("auth_token");
      return res;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "session_expired");
    const res = NextResponse.redirect(url);
    res.cookies.delete("auth_token");
    return res;
  }

  const role = payload.role as string;
  const tenantId = payload.tenant_id as string | null;
  const isSuperAdmin = role === "super_admin";

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
    return NextResponse.next();
  }

  // 5. Tenant users cannot access /admin/*
  if (isAdminRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 6. Tenant users must have a tenant_id
  if (!tenantId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "no_tenant");
    const res = NextResponse.redirect(url);
    res.cookies.delete("auth_token");
    return res;
  }

  // 7. Fetch tenant status/onboarding from tenant-service
  const tenant = await fetchTenantStatus(token, tenantId);

  if (!tenant) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "tenant_missing");
    const res = NextResponse.redirect(url);
    res.cookies.delete("auth_token");
    return res;
  }

  // 8. Suspended tenant → /account-sospeso
  if (tenant.status === "suspended") {
    if (!isSuspendedPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/account-sospeso";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 9. Expired plan → /account-sospeso?motivo=piano_scaduto
  const planExpired =
    tenant.plan_expires_at && new Date(tenant.plan_expires_at) < new Date();
  if (planExpired) {
    if (!isSuspendedPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/account-sospeso";
      url.searchParams.set("motivo", "piano_scaduto");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Active tenants shouldn't sit on /account-sospeso
  if (isSuspendedPage && tenant.status !== "suspended") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 10. Onboarding not completed → /onboarding
  if (!tenant.onboarding_completed && !isOnboardingPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // 11. If onboarding is done and user goes to /onboarding → dashboard
  if (tenant.onboarding_completed && isOnboardingPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 12. Root → dashboard
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
