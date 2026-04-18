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
  return { supabase, profile, user };
}

export async function GET() {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("assignments")
    .select(`
      id, year, type, status, notes, created_at,
      companies ( id, name )
    `)
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const createSchema = z.object({
  company_id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  type: z.enum(["revisione_legale", "collegio_sindacale", "sindaco_unico"]),
  notes: z.string().max(2000).optional().nullable(),
  member_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["tenant_owner", "revisor"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { supabase, profile, user } = ctx;
  const { member_ids, ...assignmentData } = parsed.data;

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      ...assignmentData,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add team members
  if (member_ids?.length) {
    await supabase.from("assignment_members").insert(
      member_ids.map((uid) => ({ assignment_id: data.id, user_id: uid })),
    );
  }

  // Auto-create 4 quarters
  await supabase.from("quarters").insert([1, 2, 3, 4].map((q) => ({
    assignment_id: data.id,
    tenant_id: profile.tenant_id,
    quarter: q,
  })));

  return NextResponse.json({ id: data.id }, { status: 201 });
}
