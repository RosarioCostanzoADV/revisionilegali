import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getTenantUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_active || !profile.tenant_id) return null;
  return { user, profile, supabase };
}

// ── GET /api/tenant/settings ──────────────────────────────────────────────────
export async function GET() {
  const ctx = await getTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile, supabase } = ctx;

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select(`
      id, name, referent_name, phone, vat_number, timezone,
      logo_url, status, plan_id, plan_expires_at, onboarding_completed,
      created_at, updated_at,
      plans ( id, name, max_assignments, max_users, storage_gb,
              ai_quota, vigilance_module, ai_drafts_module, advanced_import )
    `)
    .eq("id", profile.tenant_id!)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tenant) return NextResponse.json({ error: "Tenant non trovato" }, { status: 404 });

  return NextResponse.json(tenant);
}

// ── PATCH /api/tenant/settings ────────────────────────────────────────────────
const patchSchema = z.object({
  name: z.string().min(2, "Nome studio obbligatorio").optional(),
  referent_name: z.string().min(2).nullable().optional(),
  phone: z.string().nullable().optional(),
  vat_number: z.string().nullable().optional(),
  timezone: z.string().optional(),
});

export async function PATCH(request: Request) {
  const ctx = await getTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only tenant_owner (or super_admin) can update settings
  if (!["tenant_owner", "super_admin"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("tenants")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", ctx.profile.tenant_id!)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
