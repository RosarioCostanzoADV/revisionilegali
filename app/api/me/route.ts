import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MeResponse } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, full_name, is_active, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 },
    );
  }

  let tenant: MeResponse["tenant"] = null;
  let plan: MeResponse["plan"] = null;

  if (profile.tenant_id) {
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("id, name, status, onboarding_completed, plan_id")
      .eq("id", profile.tenant_id)
      .maybeSingle();

    if (tenantRow) {
      tenant = tenantRow;

      if (tenantRow.plan_id) {
        const { data: planRow } = await supabase
          .from("plans")
          .select(
            "id, name, max_assignments, max_users, storage_gb, ai_quota, vigilance_module, ai_drafts_module, advanced_import",
          )
          .eq("id", tenantRow.plan_id)
          .maybeSingle();
        plan = planRow ?? null;
      }
    }
  }

  const response: MeResponse = {
    user: { id: user.id, email: user.email ?? "" },
    profile: {
      role: profile.role,
      full_name: profile.full_name,
      is_active: profile.is_active,
      tenant_id: profile.tenant_id,
    },
    tenant,
    plan,
  };

  return NextResponse.json(response);
}
