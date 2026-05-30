import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCSV, parseSpreadsheet, parsePDF } from "@/lib/accounting/parsers";
import { mapBilancioWithGemini, enrichAllLocally } from "@/lib/gemini/mapBilancio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  return { profile };
}

export async function POST(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["tenant_owner", "revisor"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formato richiesta non valido." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const doc_type = (formData.get("doc_type") as string) || "bilancio_verifica";

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "File obbligatorio." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File troppo grande. Massimo 10 MB." }, { status: 400 });
  }

  // Fase 1: estrazione testo locale (zero token)
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isSpreadsheet = ["xlsx", "xls", "ods"].includes(ext);
  const isPDF = ext === "pdf";

  // Leggi il buffer una sola volta (arrayBuffer() non è ri-leggibile su alcuni runtime)
  const fileBuffer = isSpreadsheet || isPDF ? await file.arrayBuffer() : null;
  const fileText = !isPDF && !isSpreadsheet ? await file.text() : null;

  let rawEntries;
  try {
    if (isSpreadsheet) {
      rawEntries = parseSpreadsheet(fileBuffer!);
    } else if (isPDF) {
      rawEntries = await parsePDF(fileBuffer!);
    } else {
      rawEntries = parseCSV(fileText!);
    }
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    return NextResponse.json(
      { error: `Errore durante la lettura del file: ${msg}` },
      { status: 400 },
    );
  }

  if (rawEntries.length === 0) {
    let hint = "";
    if (isPDF && fileBuffer) {
      try {
        const { extractText } = await import("unpdf");
        const result = await extractText(new Uint8Array(fileBuffer), { mergePages: true });
        const text = (result as { text: string }).text ?? "";
        hint = `\nTesto estratto (800 car.): ${text.substring(0, 800)}`;
      } catch {
        hint = "\n(impossibile estrarre il testo dal PDF)";
      }
    }
    return NextResponse.json(
      { error: `Nessuna voce rilevata nel file.${hint}` },
      { status: 400 },
    );
  }

  // Fase 2/3: mapping AI solo per bilancio_verifica
  let entries;
  let ai_used = false;
  let ai_error: string | null = null;

  if (doc_type === "bilancio_verifica" && process.env.GEMINI_API_KEY) {
    try {
      entries = await mapBilancioWithGemini(rawEntries);
      ai_used = true;
    } catch (err) {
      ai_error = err instanceof Error ? err.message : String(err);
      entries = enrichAllLocally(rawEntries);
    }
  } else if (doc_type === "bilancio_verifica" && !process.env.GEMINI_API_KEY) {
    ai_error = "GEMINI_API_KEY non configurata";
    entries = enrichAllLocally(rawEntries);
  } else {
    entries = enrichAllLocally(rawEntries);
  }

  const gemini_key_present = !!process.env.GEMINI_API_KEY;

  return NextResponse.json({
    entries,
    ai_used,
    ai_error: ai_error ?? null,
    doc_type,
    gemini_key_present,
  });
}
