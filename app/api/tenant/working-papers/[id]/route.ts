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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("working_papers")
    .select("id, title, area, content, status, prepared_by, reviewed_by, reviewed_at, created_at, updated_at, quarter_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(data);
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  area: z.enum([
    "cassa_banche", "crediti_clienti", "debiti_fornitori",
    "immobilizzazioni", "rimanenze", "patrimonio_netto",
    "ricavi", "costi", "imposte", "adempimenti", "altro",
  ]).optional(),
  content: z.string().max(20000).nullable().optional(),
  status: z.enum(["bozza", "in_revisione", "approvata"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase, profile, user } = ctx;

  // Recupera carta per verificare lo stato attuale
  const { data: wp } = await supabase
    .from("working_papers")
    .select("id, status, prepared_by, tenant_id")
    .eq("id", id)
    .maybeSingle();

  if (!wp) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  // Carta approvata: nessuna modifica consentita
  if (wp.status === "approvata") {
    return NextResponse.json({ error: "Carta approvata: non modificabile." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const isOwnerOrRevisor = ["tenant_owner", "revisor"].includes(profile.role);
  const isPreparer = wp.prepared_by === user.id;

  // Solo il preparer (in bozza) o owner/revisor possono modificare
  if (!isPreparer && !isOwnerOrRevisor) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  // Approvazione: solo owner/revisor
  if (parsed.data.status === "approvata" && !isOwnerOrRevisor) {
    return NextResponse.json({ error: "Solo revisore o titolare può approvare." }, { status: 403 });
  }

  // Carta in_revisione: solo owner/revisor può modificare contenuto
  if (wp.status === "in_revisione" && !isOwnerOrRevisor && parsed.data.status !== "bozza") {
    return NextResponse.json({ error: "Carta in revisione: solo il revisore può modificarla." }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  // Se approvazione, salva chi ha approvato e quando
  if (parsed.data.status === "approvata") {
    updateData.reviewed_by = user.id;
    updateData.reviewed_at = new Date().toISOString();
  }

  // Se si rimanda in bozza, azzera revisore
  if (parsed.data.status === "bozza") {
    updateData.reviewed_by = null;
    updateData.reviewed_at = null;
  }

  const { error } = await supabase
    .from("working_papers")
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

  const { data: wp } = await supabase
    .from("working_papers")
    .select("id, status, prepared_by")
    .eq("id", id)
    .maybeSingle();

  if (!wp) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  if (wp.status === "approvata") {
    return NextResponse.json({ error: "Carta approvata: non eliminabile." }, { status: 403 });
  }

  const canDelete =
    wp.prepared_by === user.id ||
    ["tenant_owner", "revisor"].includes(profile.role);

  if (!canDelete) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const { error } = await supabase.from("working_papers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
