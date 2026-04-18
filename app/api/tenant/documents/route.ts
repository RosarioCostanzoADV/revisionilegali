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

export async function GET(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quarter_id = searchParams.get("quarter_id");
  if (!quarter_id) return NextResponse.json({ error: "quarter_id required" }, { status: 400 });

  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, file_path, file_size, mime_type, category, notes, created_at, uploaded_by")
    .eq("quarter_id", quarter_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/csv",
];

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile, user } = ctx;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formato richiesta non valido." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const quarter_id = formData.get("quarter_id") as string | null;
  const category = (formData.get("category") as string) || "altro";
  const customName = (formData.get("name") as string) || "";
  const notes = (formData.get("notes") as string) || "";

  if (!file || !quarter_id) {
    return NextResponse.json({ error: "File e quarter_id sono obbligatori." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File troppo grande. Massimo 20 MB." }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo file non supportato." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${profile.tenant_id}/${quarter_id}/${uniqueName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Usa admin client per lo storage per evitare problemi di policy
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Salva metadati nel DB con client autenticato
  const { supabase } = ctx;
  const { data, error: dbError } = await supabase
    .from("documents")
    .insert({
      quarter_id,
      tenant_id: profile.tenant_id,
      uploaded_by: user.id,
      name: customName || file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      category,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (dbError) {
    // Prova a pulire il file caricato
    await admin.storage.from("documents").remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
