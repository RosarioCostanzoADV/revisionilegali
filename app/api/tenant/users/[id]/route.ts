import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireTenantOwner() {
  const supabase = await createClient();
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

const patchSchema = z.object({
  role: z.enum(["revisor", "collaborator", "syndic"]).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await requireTenantOwner();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();

  // Ensure target user belongs to same tenant
  const { data: target } = await admin
    .from("user_profiles")
    .select("tenant_id, role")
    .eq("id", id)
    .maybeSingle();

  if (!target || target.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  // Cannot modify a tenant_owner
  if (target.role === "tenant_owner") {
    return NextResponse.json({ error: "Non puoi modificare il titolare" }, { status: 403 });
  }

  const { error } = await admin
    .from("user_profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
