import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") return null;
  return { user };
}

const schema = z.object({
  tenant_id: z.string().uuid("tenant_id non valido"),
  full_name: z.string().min(2, "Nome obbligatorio"),
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Password minimo 8 caratteri"),
  role: z.enum(["tenant_owner", "revisor", "collaborator", "syndic"]),
});

export async function POST(request: Request) {
  const ctx = await requireSuperAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return NextResponse.json({ error: first ?? "Dati non validi" }, { status: 400 });
  }

  const { tenant_id, full_name, email, password, role } = parsed.data;
  const admin = createAdminClient();

  // Verify tenant exists
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("id", tenant_id)
    .maybeSingle();
  if (!tenant) return NextResponse.json({ error: "Tenant non trovato" }, { status: 404 });

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    app_metadata: { role, tenant_id },
  });

  if (authErr || !authData.user) {
    return NextResponse.json(
      { error: authErr?.message ?? "Errore creazione utente" },
      { status: 500 },
    );
  }

  // Create profile
  const { error: profileErr } = await admin.from("user_profiles").upsert(
    {
      id: authData.user.id,
      tenant_id,
      role,
      full_name,
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
