import { read as xlsxRead, utils as xlsxUtils } from "xlsx";

export interface ParsedEntry {
  account_code: string | null;
  account_name: string;
  balance: number;
  balance_prev: number | null;
}

// Converte numero in formato italiano (1.000,50) o inglese (1,000.50) in float
export function parseNumber(s: string): number {
  if (!s) return 0;
  s = s.trim().replace(/[€$\s"']/g, "");
  if (!s) return 0;

  const negative = (s.startsWith("(") && s.endsWith(")")) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/^-/, "");

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts[1] && parts[1].length <= 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : negative ? -num : num;
}

export function detectSeparator(line: string): string {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

export function splitCSVRow(line: string, sep: string): string[] {
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

export function findCol(headers: string[], keywords: string[]): number {
  const h = headers.map((s) => s.toLowerCase().replace(/[^a-zàèéìòù0-9]/g, " ").trim());
  for (const kw of keywords) {
    const idx = h.findIndex((header) => header.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseCSV(text: string): ParsedEntry[] {
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
  const nameCol = colName !== -1 ? colName : colCode !== -1 ? -1 : 1;

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

export function parseSpreadsheet(buffer: ArrayBuffer): ParsedEntry[] {
  const wb = xlsxRead(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const rows = xlsxUtils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  if (rows.length < 2) return [];

  const headers = rows[0]!.map((c) => String(c ?? ""));
  const colCode    = findCol(headers, ["codice", "cod conto", "conto", "mastrino", "voce"]);
  const colName    = findCol(headers, ["descrizione", "desc", "denominazione", "ragione"]);
  const colBalance = findCol(headers, ["saldo finale", "saldo attuale", "saldo corrente", "saldo al", "saldo"]);
  const colPrev    = findCol(headers, ["precedente", "prec", "anno prec", "saldo prec", "esercizio prec"]);
  const colDare    = findCol(headers, ["dare", "debito", "debit"]);
  const colAvere   = findCol(headers, ["avere", "credito", "credit"]);

  const useDareAvere = colBalance === -1 && colDare !== -1 && colAvere !== -1;
  const nameCol = colName !== -1 ? colName : colCode !== -1 ? -1 : 1;

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

export async function parsePDF(buffer: ArrayBuffer): Promise<ParsedEntry[]> {
  const { extractText } = await import("unpdf");
  const { text: rawText } = await extractText(new Uint8Array(buffer), { mergePages: true });
  if (!rawText) return [];

  const text = rawText.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ");

  const SKIP_NAME = /^(Conto|Descrizione|Saldo|Rettifiche|Part|Csp|Data|Pagina|BILANCIO|STATO|CONTO|ATTIVITA|PASSIVITA|COSTI|RICAVI|Totale|Utile|reddito|SEZIONI|ESERCIZIO|COMPETENZA|PATRIMONIALE|ECONOMICO|Mar)$/i;
  const CODE_RE = /\b(\d{1,2}(?:\.\d{2}){0,3}|\d{5,6})\s+(?=[A-Za-zÀ-ÿ])/g;

  interface CodePos { code: string; start: number; descStart: number }
  const positions: CodePos[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = CODE_RE.exec(text)) !== null) {
    positions.push({ code: cm[1]!, start: cm.index, descStart: cm.index + cm[0].length });
  }

  if (positions.length === 0) return [];

  const entries: ParsedEntry[] = [];
  const IT_NUM_RE = /\d{1,3}(?:\.\d{3})*,\d{2}-?/g;

  for (let i = 0; i < positions.length; i++) {
    const { code, descStart } = positions[i]!;
    const segEnd = positions[i + 1]?.start ?? text.length;
    const segment = text.substring(descStart, segEnd).trim();

    const firstNumMatch = segment.match(/\d{1,3}(?:\.\d{3})*,\d{2}/);
    if (!firstNumMatch || firstNumMatch.index === undefined) continue;

    const name = segment.substring(0, firstNumMatch.index).trim().replace(/\s+/g, " ");
    if (!name || name.length < 2) continue;
    if (SKIP_NAME.test(name.split(" ")[0]!)) continue;

    const nums = [...segment.matchAll(IT_NUM_RE)];
    if (!nums.length) continue;

    const balance = parseNumber(nums[nums.length - 1]![0]!);
    entries.push({ account_code: code, account_name: name, balance, balance_prev: null });
  }

  return entries;
}
