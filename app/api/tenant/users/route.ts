import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireTenantOwner() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_active) return null;
  if (profile.role !== "tenant_owner" && profile.role !== "super_admin") return null;
  return profile;
}

// ── GET /api/tenant/users ─────────────────────────────────────────────────────
export async function GET() {
  const profile = await requireTenantOwner();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from("user_profiles")
    .select("id, full_name, role, is_active, created_at")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(users ?? []);
}

// ── POST /api/tenant/users ────────────────────────────────────────────────────
const createUserSchema = z.object({
  full_name: z.string().min(2, "Nome obbligatorio"),
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Password minimo 8 caratteri"),
  role: z.enum(["revisor", "collaborator", "syndic"]),
});

export async function POST(request: Request) {
  const profile = await requireTenantOwner();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check user limit for the tenant's plan
  const { data: tenant } = await admin
    .from("tenants")
    .select("plan_id, plans ( max_users )")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  const maxUsers = (tenant?.plans as { max_users: number } | null)?.max_users;
  if (maxUsers) {
    const { count } = await admin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true);

    if ((count ?? 0) >= maxUsers) {
      return NextResponse.json(
        { error: `Limite utenti raggiunto (max ${maxUsers} per questo piano)` },
        { status: 422 },
      );
    }
  }

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
    app_metadata: { role: parsed.data.role, tenant_id: profile.tenant_id },
  });

  if (authErr || !authData.user) {
    return NextResponse.json(
      { error: authErr?.message ?? "Errore creazione utente" },
      { status: 500 },
    );
  }

  // Upsert profile
  const { error: profileErr } = await admin.from("user_profiles").upsert(
    {
      id: authData.user.id,
      tenant_id: profile.tenant_id,
      role: parsed.data.role,
      full_name: parsed.data.full_name,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ user_id: authData.user.id }, { status: 201 });
}
