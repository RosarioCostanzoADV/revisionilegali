import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireTenantUser() {
  const supabase = createClient();
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("findings")
    .select("id, title, description, recommendation, severity, status, response, due_date, closed_at, raised_by, working_paper_id, created_at, updated_at, quarter_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(data);
}

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  recommendation: z.string().max(5000).nullable().optional(),
  severity: z.enum(["bassa", "media", "alta", "critica"]).optional(),
  status: z.enum(["aperto", "in_gestione", "risolto", "chiuso"]).optional(),
  response: z.string().max(5000).nullable().optional(),
  due_date: z.string().nullable().optional(),
  working_paper_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status === "chiuso") {
    updateData.closed_at = new Date().toISOString();
  } else if (parsed.data.status && parsed.data.status !== "chiuso") {
    updateData.closed_at = null;
  }

  const { supabase } = ctx;
  const { error } = await supabase
    .from("findings")
    .update(updateData)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase, profile, user } = ctx;

  const { data: finding } = await supabase
    .from("findings")
    .select("id, raised_by, status")
    .eq("id", id)
    .maybeSingle();

  if (!finding) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  if (finding.status === "chiuso") {
    return NextResponse.json({ error: "Rilievo chiuso: non eliminabile." }, { status: 403 });
  }

  const canDelete =
    finding.raised_by === user.id ||
    ["tenant_owner", "revisor"].includes(profile.role);

  if (!canDelete) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });

  const { error } = await supabase.from("findings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
