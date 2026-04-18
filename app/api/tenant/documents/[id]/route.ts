import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const admin = createAdminClient();

  // Recupera metadati dal DB
  const { supabase } = ctx;
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, file_path, name, mime_type")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  // Genera URL firmato (1 ora)
  const { data: signed, error: signError } = await admin.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 3600, { download: doc.name });

  if (signError || !signed) {
    return NextResponse.json({ error: "Impossibile generare il link." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase, profile, user } = ctx;

  // Recupera il documento
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, file_path, uploaded_by, tenant_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  // Solo chi ha caricato, oppure owner/revisor del tenant
  const canDelete =
    doc.uploaded_by === user.id ||
    ["tenant_owner", "revisor"].includes(profile.role);

  if (!canDelete) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // Elimina dal DB
  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Elimina dallo storage
  const admin = createAdminClient();
  await admin.storage.from("documents").remove([doc.file_path]);

  return NextResponse.json({ ok: true });
}
