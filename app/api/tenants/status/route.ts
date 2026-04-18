import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Super admin has no single tenant; return a synthetic payload.
  if (profile.role === "super_admin") {
    return NextResponse.json({
      status: "active",
      plan_expires_at: null,
      super_admin: true,
    });
  }

  if (!profile.tenant_id) {
    return NextResponse.json({ error: "No tenant" }, { status: 404 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("status, plan_expires_at")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: tenant.status,
    plan_expires_at: tenant.plan_expires_at,
  });
}
