'use strict';

/**
 * Parser contabili per CSV, XLSX e PDF (bilancio di verifica italiano).
 * Portato da lib/accounting/parsers.ts.
 */

const { read: xlsxRead, utils: xlsxUtils } = require('xlsx');

// ── Helpers numerici ──────────────────────────────────────────────────────────

/**
 * Converte numero in formato italiano (1.000,50) o inglese (1,000.50) in float.
 */
function parseNumber(s) {
  if (!s) return 0;
  s = String(s).trim().replace(/[€$\s"']/g, '');
  if (!s) return 0;

  const negative =
    (s.startsWith('(') && s.endsWith(')')) ||
    s.startsWith('-') ||
    s.endsWith('-');
  s = s.replace(/[()]/g, '').replace(/^-/, '').replace(/-$/, '');

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = s.split(',');
    if (parts[1] && parts[1].length <= 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : negative ? -num : num;
}

function detectSeparator(line) {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semicolons >= commas ? ';' : ',';
}

function splitCSVRow(line, sep) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function findCol(headers, keywords) {
  const h = headers.map((s) => s.toLowerCase().replace(/[^a-zàèéìòù0-9]/g, ' ').trim());
  for (const kw of keywords) {
    const idx = h.findIndex((header) => header.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

// ── Parser CSV ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = splitCSVRow(lines[0], sep);

  const colCode    = findCol(headers, ['codice', 'cod conto', 'conto', 'mastrino', 'voce']);
  const colName    = findCol(headers, ['descrizione', 'desc', 'denominazione', 'ragione']);
  const colBalance = findCol(headers, ['saldo finale', 'saldo attuale', 'saldo corrente', 'saldo al', 'saldo']);
  const colPrev    = findCol(headers, ['precedente', 'prec', 'anno prec', 'saldo prec', 'esercizio prec']);
  const colDare    = findCol(headers, ['dare', 'debito', 'debit']);
  const colAvere   = findCol(headers, ['avere', 'credito', 'credit']);

  const useDareAvere = colBalance === -1 && colDare !== -1 && colAvere !== -1;
  const nameCol = colName !== -1 ? colName : colCode !== -1 ? -1 : 1;

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVRow(lines[i], sep);
    if (cells.length < 2) continue;

    const code = colCode !== -1 ? (cells[colCode] ?? null) : null;
    const name = nameCol !== -1 ? (cells[nameCol] ?? '') : (cells[1] ?? '');
    if (!name) continue;

    let balance = 0;
    if (useDareAvere) {
      balance = parseNumber(cells[colDare] ?? '') - parseNumber(cells[colAvere] ?? '');
    } else if (colBalance !== -1) {
      balance = parseNumber(cells[colBalance] ?? '');
    } else {
      balance = parseNumber(cells[cells.length - 1] ?? '');
    }

    const prev = colPrev !== -1 ? parseNumber(cells[colPrev] ?? '') : null;
    entries.push({
      account_code: code || null,
      account_name: name,
      balance,
      balance_prev: prev !== null && prev !== 0 ? prev : null,
    });
  }
  return entries;
}

// ── Parser XLSX ───────────────────────────────────────────────────────────────

function parseSpreadsheet(buffer) {
  const wb = xlsxRead(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const rows = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  const headers = rows[0].map((c) => String(c ?? ''));
  const colCode    = findCol(headers, ['codice', 'cod conto', 'conto', 'mastrino', 'voce']);
  const colName    = findCol(headers, ['descrizione', 'desc', 'denominazione', 'ragione']);
  const colBalance = findCol(headers, ['saldo finale', 'saldo attuale', 'saldo corrente', 'saldo al', 'saldo']);
  const colPrev    = findCol(headers, ['precedente', 'prec', 'anno prec', 'saldo prec', 'esercizio prec']);
  const colDare    = findCol(headers, ['dare', 'debito', 'debit']);
  const colAvere   = findCol(headers, ['avere', 'credito', 'credit']);

  const useDareAvere = colBalance === -1 && colDare !== -1 && colAvere !== -1;
  const nameCol = colName !== -1 ? colName : colCode !== -1 ? -1 : 1;

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].map((c) => String(c ?? ''));
    if (cells.length < 2) continue;

    const code = colCode !== -1 ? (cells[colCode] ?? null) : null;
    const name = nameCol !== -1 ? (cells[nameCol] ?? '') : (cells[1] ?? '');
    if (!name?.trim()) continue;

    let balance = 0;
    if (useDareAvere) {
      balance = parseNumber(cells[colDare] ?? '') - parseNumber(cells[colAvere] ?? '');
    } else if (colBalance !== -1) {
      balance = parseNumber(cells[colBalance] ?? '');
    } else {
      balance = parseNumber(cells[cells.length - 1] ?? '');
    }

    const prev = colPrev !== -1 ? parseNumber(cells[colPrev] ?? '') : null;
    entries.push({
      account_code: String(code || '').trim() || null,
      account_name: String(name).trim(),
      balance,
      balance_prev: prev !== null && prev !== 0 ? prev : null,
    });
  }
  return entries;
}

// ── Rilevamento sezione PDF ───────────────────────────────────────────────────

function detectPageSectionType(text) {
  const t = text.toLowerCase();
  const hasCE     = /conto\s+econom/.test(t) || /sezione\s+(costi|ricavi)/.test(t);
  const hasAttiv  = /attivit[aà]|sezione\s+attiv/.test(t);
  const hasPassiv = /passivit[aà]|sezione\s+passiv|patrimonio\s+netto/.test(t);
  if (hasCE) return 'CE';
  if (hasAttiv && hasPassiv) return 'SP_BILANCIO';
  if (hasAttiv) return 'SP_A';
  if (hasPassiv) return 'SP_P';
  return null;
}

function inferSectionFromCode(code, name) {
  const base = parseInt((code ?? '').split('.')[0] ?? '', 10);
  if (isNaN(base)) return null;

  if (base >= 44) {
    if ((base >= 44 && base <= 53) || base === 73) return 'CE_R';
    return 'CE_C';
  }
  if (base <= 21) return 'SP_A';

  if (base === 35) {
    const lower = name.toLowerCase();
    if (
      lower.includes('accont') ||
      lower.includes('liquidazione iva') ||
      lower.includes('iva su acquisti') ||
      lower.includes('credito iva') ||
      lower.includes("credito d'imposta")
    ) return 'SP_A';
    return 'SP_P';
  }
  return 'SP_P';
}

function extractEntriesFromText(text, pageSection) {
  const SKIP_NAME = /^(Conto|Descrizione|Saldo|Rettifiche|Part|Csp|Data|Pagina|BILANCIO|STATO|CONTO|ATTIVITA|PASSIVITA|COSTI|RICAVI|Totale|Utile|reddito|SEZIONI|ESERCIZIO|COMPETENZA|PATRIMONIALE|ECONOMICO|Mar)$/i;
  const CODE_RE = /\b(\d{1,2}(?:\.\d{2}){0,3}|\d{5,6})\s+(?=[A-Za-zÀ-ÿ])/g;

  const positions = [];
  let cm;
  while ((cm = CODE_RE.exec(text)) !== null) {
    positions.push({ code: cm[1], start: cm.index, descStart: cm.index + cm[0].length });
  }
  if (positions.length === 0) return [];

  const IT_NUM_RE = /\d{1,3}(?:\.\d{3})*,\d{2}-?/g;
  const entries = [];

  for (let i = 0; i < positions.length; i++) {
    const { code, descStart } = positions[i];
    const segEnd = positions[i + 1]?.start ?? text.length;
    const segment = text.substring(descStart, segEnd).trim();

    const firstNumMatch = segment.match(/\d{1,3}(?:\.\d{3})*,\d{2}/);
    if (!firstNumMatch || firstNumMatch.index === undefined) continue;

    const name = segment.substring(0, firstNumMatch.index).trim().replace(/\s+/g, ' ');
    if (!name || name.length < 2) continue;
    if (SKIP_NAME.test(name)) continue;

    const nums = [...segment.matchAll(IT_NUM_RE)];
    if (!nums.length) continue;

    const parsedNums = nums.map((n) => parseNumber(n[0]));
    let balance;
    if (
      parsedNums.length >= 2 &&
      Math.abs(parsedNums[0] + parsedNums[1]) < 0.01 &&
      Math.abs(parsedNums[0]) > 0.01
    ) {
      balance = 0;
    } else {
      balance = parsedNums[parsedNums.length - 1];
    }

    let pdf_section;
    if (pageSection === 'SP_A') {
      pdf_section = 'SP_A';
    } else if (pageSection === 'SP_P') {
      pdf_section = 'SP_P';
    } else {
      pdf_section = inferSectionFromCode(code, name);
    }

    entries.push({ account_code: code, account_name: name, balance, balance_prev: null, pdf_section });
  }

  return entries;
}

// ── Gerarchia foglie ──────────────────────────────────────────────────────────

function keepHierarchyLeaves(entries) {
  const dotted = entries.filter((e) => (e.account_code ?? '').includes('.'));
  if (dotted.length === 0) return entries;
  const codes = new Set(dotted.map((e) => e.account_code));
  return dotted.filter((e) => {
    const prefix = e.account_code + '.';
    for (const other of codes) {
      if (other !== e.account_code && other.startsWith(prefix)) return false;
    }
    return true;
  });
}

// ── Parser PDF ────────────────────────────────────────────────────────────────

async function parsePDF(buffer) {
  const { extractText } = await import('unpdf');

  let pages = [];
  try {
    const perPage = await extractText(new Uint8Array(buffer), { mergePages: false });
    const raw = perPage.text;
    pages = Array.isArray(raw) ? raw : [raw ?? ''];
  } catch {
    const merged = await extractText(new Uint8Array(buffer), { mergePages: true });
    pages = [merged.text ?? ''];
  }

  const allEntries = [];
  for (const rawPageText of pages) {
    if (!rawPageText?.trim()) continue;
    const text = rawPageText.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');
    const pageSection = detectPageSectionType(text);
    allEntries.push(...extractEntriesFromText(text, pageSection));
  }

  return keepHierarchyLeaves(allEntries);
}

module.exports = { parseCSV, parseSpreadsheet, parsePDF, parseNumber };
