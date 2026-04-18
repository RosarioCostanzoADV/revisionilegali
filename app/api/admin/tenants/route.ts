import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ── Guard helper ─────────────────────────────────────────────────────────────
async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") return null;
  return user;
}

// ── GET /api/admin/tenants ────────────────────────────────────────────────────
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: tenants, error } = await admin
    .from("tenants")
    .select(`
      id, name, referent_name, status, plan_id, plan_expires_at,
      onboarding_completed, created_at, updated_at,
      plans ( id, name )
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count users per tenant
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("tenant_id")
    .not("tenant_id", "is", null);

  const userCountMap: Record<string, number> = {};
  for (const p of profiles ?? []) {
    if (p.tenant_id) userCountMap[p.tenant_id] = (userCountMap[p.tenant_id] ?? 0) + 1;
  }

  const enriched = (tenants ?? []).map((t) => ({
    ...t,
    user_count: userCountMap[t.id] ?? 0,
  }));

  return NextResponse.json(enriched);
}

// ── POST /api/admin/tenants ───────────────────────────────────────────────────
const createTenantSchema = z.object({
  tenant_name: z.string().min(2, "Nome studio obbligatorio"),
  owner_email: z.string().email("Email non valida"),
  owner_name: z.string().min(2, "Nome referente obbligatorio"),
  owner_password: z.string().min(8, "Password minimo 8 caratteri"),
  plan_id: z.string().uuid().optional().nullable(),
  plan_expires_at: z.string().datetime().optional().nullable(),
  status: z.enum(["active", "trial", "suspended"]).default("active"),
});

export async function POST(request: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tenant_name, owner_email, owner_name, owner_password, plan_id, plan_expires_at, status } = parsed.data;
  const admin = createAdminClient();

  // 1. Create tenant
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({ name: tenant_name, status, plan_id: plan_id ?? null, plan_expires_at: plan_expires_at ?? null })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: tenantErr?.message ?? "Errore creazione tenant" }, { status: 500 });
  }

  // 2. Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: owner_email,
    password: owner_password,
    email_confirm: true,
    user_metadata: { full_name: owner_name },
    app_metadata: { role: "tenant_owner", tenant_id: tenant.id },
  });

  if (authErr || !authData.user) {
    // Rollback tenant
    await admin.from("tenants").delete().eq("id", tenant.id);
    return NextResponse.json({ error: authErr?.message ?? "Errore creazione utente" }, { status: 500 });
  }

  // 3. Upsert user_profile explicitly — the trigger may skip it if app_metadata
  //    is not yet merged into raw_app_meta_data at trigger fire time.
  const { error: profileErr } = await admin.from("user_profiles").upsert(
    {
      id: authData.user.id,
      tenant_id: tenant.id,
      role: "tenant_owner",
      full_name: owner_name,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    // Rollback both
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("tenants").delete().eq("id", tenant.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ tenant_id: tenant.id, user_id: authData.user.id }, { status: 201 });
}
