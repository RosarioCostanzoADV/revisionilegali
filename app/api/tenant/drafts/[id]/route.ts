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
    .from("drafts")
    .select("id, title, type, content, status, created_by, created_at, updated_at, assignment_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(data);
}

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().max(50000).nullable().optional(),
  status: z.enum(["bozza", "definitivo"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["tenant_owner", "revisor"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { supabase } = ctx;
  const { error } = await supabase
    .from("drafts")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
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

  const { data: draft } = await supabase
    .from("drafts")
    .select("id, created_by, status")
    .eq("id", id)
    .maybeSingle();

  if (!draft) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  if (draft.status === "definitivo") {
    return NextResponse.json({ error: "Documento definitivo: non eliminabile." }, { status: 403 });
  }

  const canDelete =
    draft.created_by === user.id ||
    ["tenant_owner", "revisor"].includes(profile.role);

  if (!canDelete) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });

  const { error } = await supabase.from("drafts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
