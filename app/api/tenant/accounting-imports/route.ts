import { NextResponse } from "next/server";
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

// Converte numero in formato italiano (1.000,50) o inglese (1,000.50) in float
function parseNumber(s: string): number {
  if (!s) return 0;
  s = s.trim().replace(/[€$\s"']/g, "");
  if (!s) return 0;

  const negative = s.startsWith("(") && s.endsWith(")") || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/^-/, "");

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastDot) {
      // Formato italiano: 1.000,50
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato inglese: 1,000.50
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts[1] && parts[1].length <= 2) {
      s = s.replace(",", "."); // decimale
    } else {
      s = s.replace(/,/g, ""); // separatore migliaia
    }
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : (negative ? -num : num);
}

// Rileva separatore CSV (;  o ,)
function detectSeparator(line: string): string {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

// Splitta riga CSV gestendo valori quotati
function splitCSVRow(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

// Trova indice colonna per keyword
function findCol(headers: string[], keywords: string[]): number {
  const h = headers.map((s) => s.toLowerCase().replace(/[^a-zàèéìòù0-9]/g, " ").trim());
  for (const kw of keywords) {
    const idx = h.findIndex((header) => header.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

interface ParsedEntry {
  account_code: string | null;
  account_name: string;
  balance: number;
  balance_prev: number | null;
}

function parseCSV(text: string): ParsedEntry[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = splitCSVRow(lines[0], sep);

  // Rileva colonne
  const colCode = findCol(headers, ["codice", "cod conto", "conto", "mastrino", "voce"]);
  const colName = findCol(headers, ["descrizione", "desc", "denominazione", "ragione"]);
  const colBalance = findCol(headers, ["saldo finale", "saldo attuale", "saldo corrente", "saldo al", "saldo"]);
  const colPrev = findCol(headers, ["precedente", "prec", "anno prec", "saldo prec", "esercizio prec"]);
  const colDare = findCol(headers, ["dare", "debito", "debit"]);
  const colAvere = findCol(headers, ["avere", "credito", "credit"]);

  // Fallback: se non trovato saldo ma ci sono dare/avere, calcolalo
  const useDareAvere = colBalance === -1 && colDare !== -1 && colAvere !== -1;

  // Se non troviamo nemmeno il nome, proviamo a usare la seconda colonna
  const nameCol = colName !== -1 ? colName : (colCode !== -1 ? -1 : 1);

  const entries: ParsedEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVRow(lines[i], sep);
    if (cells.length < 2) continue;

    const code = colCode !== -1 ? cells[colCode] || null : null;
    const name = nameCol !== -1 ? cells[nameCol] : (cells[1] ?? "");
    if (!name) continue;

    let balance = 0;
    if (useDareAvere) {
      const dare = parseNumber(cells[colDare] ?? "");
      const avere = parseNumber(cells[colAvere] ?? "");
      balance = dare - avere;
    } else if (colBalance !== -1) {
      balance = parseNumber(cells[colBalance] ?? "");
    } else {
      // Prova a usare l'ultima colonna numerica
      const lastNum = parseNumber(cells[cells.length - 1]);
      balance = lastNum;
    }

    const prev = colPrev !== -1 ? parseNumber(cells[colPrev] ?? "") : null;

    entries.push({
      account_code: code || null,
      account_name: name,
      balance,
      balance_prev: prev !== 0 ? prev : null,
    });
  }

  return entries;
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
    .select("id, filename, period_label, row_count, notes, created_at, uploaded_by")
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

  if (!file || !quarter_id) {
    return NextResponse.json({ error: "File e quarter_id obbligatori." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File troppo grande. Massimo 5 MB." }, { status: 400 });
  }

  const text = await file.text();
  const entries = parseCSV(text);

  if (entries.length === 0) {
    return NextResponse.json({
      error: "Nessuna riga rilevata. Verifica il formato del file CSV (separatore ; o , con intestazione in prima riga).",
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
