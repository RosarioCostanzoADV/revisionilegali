import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";

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

  const sep = detectSeparator(lines[0]!);
  const headers = splitCSVRow(lines[0]!, sep);

  const colCode    = findCol(headers, ["codice", "cod conto", "conto", "mastrino", "voce"]);
  const colName    = findCol(headers, ["descrizione", "desc", "denominazione", "ragione"]);
  const colBalance = findCol(headers, ["saldo finale", "saldo attuale", "saldo corrente", "saldo al", "saldo"]);
  const colPrev    = findCol(headers, ["precedente", "prec", "anno prec", "saldo prec", "esercizio prec"]);
  const colDare    = findCol(headers, ["dare", "debito", "debit"]);
  const colAvere   = findCol(headers, ["avere", "credito", "credit"]);

  const useDareAvere = colBalance === -1 && colDare !== -1 && colAvere !== -1;
  const nameCol = colName !== -1 ? colName : (colCode !== -1 ? -1 : 1);

  const entries: ParsedEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVRow(lines[i]!, sep);
    if (cells.length < 2) continue;

    const code = colCode !== -1 ? (cells[colCode] ?? null) : null;
    const name = nameCol !== -1 ? (cells[nameCol] ?? "") : (cells[1] ?? "");
    if (!name) continue;

    let balance = 0;
    if (useDareAvere) {
      balance = parseNumber(cells[colDare] ?? "") - parseNumber(cells[colAvere] ?? "");
    } else if (colBalance !== -1) {
      balance = parseNumber(cells[colBalance] ?? "");
    } else {
      balance = parseNumber(cells[cells.length - 1] ?? "");
    }

    const prev = colPrev !== -1 ? parseNumber(cells[colPrev] ?? "") : null;
    entries.push({
      account_code: code || null,
      account_name: name,
      balance,
      balance_prev: prev !== null && prev !== 0 ? prev : null,
    });
  }
  return entries;
}

// Parsing Excel/ODS tramite SheetJS — converte il primo foglio in righe
function parseSpreadsheet(buffer: ArrayBuffer): ParsedEntry[] {
  const wb = xlsxRead(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  // Converti in matrice di stringhe
  const rows = xlsxUtils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  if (rows.length < 2) return [];

  // Usa le stesse logiche di findCol
  const headers = rows[0]!.map((c) => String(c ?? ""));
  const colCode    = findCol(headers, ["codice", "cod conto", "conto", "mastrino", "voce"]);
  const colName    = findCol(headers, ["descrizione", "desc", "denominazione", "ragione"]);
  const colBalance = findCol(headers, ["saldo finale", "saldo attuale", "saldo corrente", "saldo al", "saldo"]);
  const colPrev    = findCol(headers, ["precedente", "prec", "anno prec", "saldo prec", "esercizio prec"]);
  const colDare    = findCol(headers, ["dare", "debito", "debit"]);
  const colAvere   = findCol(headers, ["avere", "credito", "credit"]);

  const useDareAvere = colBalance === -1 && colDare !== -1 && colAvere !== -1;
  const nameCol = colName !== -1 ? colName : (colCode !== -1 ? -1 : 1);

  const entries: ParsedEntry[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]!.map((c) => String(c ?? ""));
    if (cells.length < 2) continue;

    const code = colCode !== -1 ? (cells[colCode] ?? null) : null;
    const name = nameCol !== -1 ? (cells[nameCol] ?? "") : (cells[1] ?? "");
    if (!name?.trim()) continue;

    let balance = 0;
    if (useDareAvere) {
      balance = parseNumber(cells[colDare] ?? "") - parseNumber(cells[colAvere] ?? "");
    } else if (colBalance !== -1) {
      balance = parseNumber(cells[colBalance] ?? "");
    } else {
      balance = parseNumber(cells[cells.length - 1] ?? "");
    }

    const prev = colPrev !== -1 ? parseNumber(cells[colPrev] ?? "") : null;
    entries.push({
      account_code: String(code || "").trim() || null,
      account_name: String(name).trim(),
      balance,
      balance_prev: prev !== null && prev !== 0 ? prev : null,
    });
  }
  return entries;
}

// Parsing PDF — il testo estratto è una stringa continua (no newline affidabili)
// Strategia: trova tutti i codici conto nel testo, poi per ognuno estrae
// la descrizione (testo fino al primo numero italiano) e il saldo (ultimo numero).
async function parsePDF(buffer: ArrayBuffer): Promise<ParsedEntry[]> {
  const { extractText } = await import("unpdf");
  const { text: rawText } = await extractText(new Uint8Array(buffer), { mergePages: true });
  if (!rawText) return [];

  // Normalizza: unifica whitespace in spazio singolo
  const text = rawText.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ");

  // Descrizioni/parole da ignorare (intestazioni, totali)
  const SKIP_NAME = /^(Conto|Descrizione|Saldo|Rettifiche|Part|Csp|Data|Pagina|BILANCIO|STATO|CONTO|ATTIVITA|PASSIVITA|COSTI|RICAVI|Totale|Utile|reddito|SEZIONI|ESERCIZIO|COMPETENZA|PATRIMONIALE|ECONOMICO|Mar)$/i;

  // Trova tutte le posizioni dei codici conto:
  // - gerarchico: "03", "03.01", "03.01.07", "03.01.07.01" (max 4 livelli di 2 cifre)
  // - cliente/fornitore: 5-6 cifre consecutive
  // Il codice deve essere seguito da spazio + lettera (non da virgola o altro numero)
  const CODE_RE = /\b(\d{1,2}(?:\.\d{2}){0,3}|\d{5,6})\s+(?=[A-Za-zÀ-ÿ])/g;

  interface CodePos { code: string; start: number; descStart: number }
  const positions: CodePos[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = CODE_RE.exec(text)) !== null) {
    positions.push({
      code: cm[1]!,
      start: cm.index,
      descStart: cm.index + cm[0].length,
    });
  }

  if (positions.length === 0) return [];

  const entries: ParsedEntry[] = [];
  // Numero in formato italiano: 1.234,56 o 1.234,56-
  const IT_NUM_RE = /\d{1,3}(?:\.\d{3})*,\d{2}-?/g;

  for (let i = 0; i < positions.length; i++) {
    const { code, descStart } = positions[i]!;
    // Il segmento va fino all'inizio del prossimo codice (o fine testo)
    const segEnd = positions[i + 1]?.start ?? text.length;
    const segment = text.substring(descStart, segEnd).trim();

    // Trova il primo numero italiano nel segmento: lì inizia la parte numerica
    const firstNumMatch = segment.match(/\d{1,3}(?:\.\d{3})*,\d{2}/);
    if (!firstNumMatch || firstNumMatch.index === undefined) continue;

    // Descrizione = testo prima del primo numero
    const name = segment.substring(0, firstNumMatch.index).trim().replace(/\s+/g, " ");
    if (!name || name.length < 2) continue;
    if (SKIP_NAME.test(name.split(" ")[0]!)) continue;

    // Tutti i numeri italiani nel segmento
    const nums = [...segment.matchAll(IT_NUM_RE)];
    if (!nums.length) continue;

    // L'ultimo numero è il "Saldo finale"
    const balance = parseNumber(nums[nums.length - 1]![0]!);

    entries.push({
      account_code: code,
      account_name: name,
      balance,
      balance_prev: null,
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

  let entries: ParsedEntry[];
  if (isSpreadsheet) {
    const buffer = await file.arrayBuffer();
    entries = parseSpreadsheet(buffer);
  } else if (isPDF) {
    const buffer = await file.arrayBuffer();
    entries = await parsePDF(buffer);
  } else {
    const text = await file.text();
    entries = parseCSV(text);
  }

  if (entries.length === 0) {
    // Debug temporaneo: mostra testo estratto per PDF
    if (isPDF) {
      const { extractText } = await import("unpdf");
      const buf2 = await file.arrayBuffer();
      const { text: dbg } = await extractText(new Uint8Array(buf2), { mergePages: true });
      return NextResponse.json({
        error: `PDF: nessuna riga rilevata. Testo estratto (primi 800 char):\n${(dbg ?? "").substring(0, 800)}`,
      }, { status: 400 });
    }
    return NextResponse.json({
      error: "Nessuna riga rilevata. Verifica che il file contenga una riga di intestazione e almeno una riga di dati.",
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
