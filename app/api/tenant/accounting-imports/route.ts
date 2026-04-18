import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCSV, parseSpreadsheet, parsePDF } from "@/lib/accounting/parsers";

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
    .from("accounting_imports")
    .select("id, filename, period_label, row_count, notes, doc_type, created_at, uploaded_by")
    .eq("quarter_id", quarter_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["tenant_owner", "revisor"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  // ── Branch JSON: entries già parsate e validate dal wizard ───────────────
  if (contentType.includes("application/json")) {
    let body: {
      quarter_id: string;
      period_label: string;
      notes?: string;
      doc_type: string;
      filename: string;
      entries: Array<{
        account_code: string | null;
        account_name: string;
        balance: number;
        balance_prev: number | null;
        voce_standard?: string | null;
        schema_civilistico?: string | null;
        audit_area?: string;
      }>;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
    }

    const { quarter_id, period_label, notes, doc_type, filename, entries } = body;
    if (!quarter_id || !entries?.length) {
      return NextResponse.json({ error: "quarter_id e entries obbligatori." }, { status: 400 });
    }

    const { supabase, profile, user } = ctx;

    const { data: importRecord, error: importError } = await supabase
      .from("accounting_imports")
      .insert({
        quarter_id,
        tenant_id: profile.tenant_id,
        uploaded_by: user.id,
        filename: filename || "import.json",
        period_label: period_label || "—",
        row_count: entries.length,
        notes: notes || null,
        doc_type: doc_type || "bilancio_verifica",
      })
      .select("id")
      .single();

    if (importError) return NextResponse.json({ error: importError.message }, { status: 500 });

    const { error: entriesError } = await supabase
      .from("accounting_entries")
      .insert(
        entries.map((e) => ({
          import_id: importRecord.id,
          tenant_id: profile.tenant_id,
          account_code: e.account_code,
          account_name: e.account_name,
          balance: e.balance,
          balance_prev: e.balance_prev,
          voce_standard: e.voce_standard ?? null,
          schema_civilistico: e.schema_civilistico ?? null,
        })),
      );

    if (entriesError) {
      await supabase.from("accounting_imports").delete().eq("id", importRecord.id);
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    return NextResponse.json({ id: importRecord.id, row_count: entries.length }, { status: 201 });
  }

  // ── Branch FormData: upload diretto (fallback / altri tipi documento) ────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formato richiesta non valido." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const quarter_id = formData.get("quarter_id") as string | null;
  const period_label = (formData.get("period_label") as string) || "—";
  const notes = (formData.get("notes") as string) || "";
  const doc_type = (formData.get("doc_type") as string) || "bilancio_verifica";

  if (!file || !quarter_id) {
    return NextResponse.json({ error: "File e quarter_id obbligatori." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File troppo grande. Massimo 10 MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isSpreadsheet = ["xlsx", "xls", "ods"].includes(ext);
  const isPDF = ext === "pdf";

  let entries;
  if (isSpreadsheet) {
    entries = parseSpreadsheet(await file.arrayBuffer());
  } else if (isPDF) {
    entries = await parsePDF(await file.arrayBuffer());
  } else {
    entries = parseCSV(await file.text());
  }

  if (entries.length === 0) {
    return NextResponse.json({
      error: "Nessuna riga rilevata. Usa il flusso di importazione guidata per caricare PDF e bilanci.",
    }, { status: 400 });
  }

  const { supabase, profile, user } = ctx;

  const { data: importRecord, error: importError } = await supabase
    .from("accounting_imports")
    .insert({
      quarter_id,
      tenant_id: profile.tenant_id,
      uploaded_by: user.id,
      filename: file.name,
      period_label,
      row_count: entries.length,
      notes: notes || null,
      doc_type,
    })
    .select("id")
    .single();

  if (importError) return NextResponse.json({ error: importError.message }, { status: 500 });

  const { error: entriesError } = await supabase
    .from("accounting_entries")
    .insert(
      entries.map((e) => ({
        import_id: importRecord.id,
        tenant_id: profile.tenant_id,
        account_code: e.account_code,
        account_name: e.account_name,
        balance: e.balance,
        balance_prev: e.balance_prev,
      })),
    );

  if (entriesError) {
    await supabase.from("accounting_imports").delete().eq("id", importRecord.id);
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  return NextResponse.json({ id: importRecord.id, row_count: entries.length }, { status: 201 });
}
