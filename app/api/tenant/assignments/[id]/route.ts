import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireTenantUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_active || !profile.tenant_id) return null;
  return { supabase, profile };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("assignments")
    .select(`
      id, year, type, status, notes, created_at, updated_at,
      companies ( id, name, fiscal_code, city ),
      assignment_members ( user_id, role, user_profiles ( id, full_name, role ) )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(data);
}

const patchSchema = z.object({
  status: z.enum(["aperto", "in_corso", "chiuso"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  member_ids: z.array(z.string().uuid()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["tenant_owner", "revisor"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { supabase } = ctx;
  const { member_ids, ...updateData } = parsed.data;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from("assignments")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace members if provided
  if (member_ids !== undefined) {
    await supabase.from("assignment_members").delete().eq("assignment_id", id);
    if (member_ids.length > 0) {
      await supabase.from("assignment_members").insert(
        member_ids.map((uid) => ({ assignment_id: id, user_id: uid })),
      );
    }
  }

  return NextResponse.json({ ok: true });
}
