import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "super_admin" ? user : null;
}

// ── GET /api/admin/tenants/[id] ───────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: tenant, error } = await admin
    .from("tenants")
    .select(`*, plans ( * )`)
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tenant) return NextResponse.json({ error: "Tenant non trovato" }, { status: 404 });

  const { data: users } = await admin
    .from("user_profiles")
    .select("id, role, full_name, is_active, created_at")
    .eq("tenant_id", id)
    .order("created_at");

  return NextResponse.json({ ...tenant, users: users ?? [] });
}

// ── PATCH /api/admin/tenants/[id] ─────────────────────────────────────────────
const patchSchema = z.object({
  status: z.enum(["active", "trial", "suspended"]).optional(),
  plan_id: z.string().uuid().nullable().optional(),
  plan_expires_at: z.string().datetime().nullable().optional(),
  name: z.string().min(2).optional(),
  referent_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
