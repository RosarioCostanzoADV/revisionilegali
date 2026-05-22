'use strict';

/**
 * Mappatura Gemini per voci contabili italiane.
 * Portato da lib/gemini/mapBilancio.ts.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { classifyAccount } = require('./classification');

const VALID_SCHEMAS = ['SP_A', 'SP_P', 'CE', 'MEMO'];
const VALID_AREAS = [
  'immobilizzazioni', 'fondi_ammortamento', 'rimanenze', 'crediti', 'altri_crediti', 'liquidita',
  'patrimonio_netto', 'debiti', 'debiti_finanziari', 'debiti_tributari',
  'tfr_fondi', 'ricavi', 'costi_personale', 'acquisti_costi', 'oneri_finanziari', 'altri',
];

const AREA_TO_SCHEMA = {
  immobilizzazioni: 'SP_A',
  rimanenze: 'SP_A',
  crediti: 'SP_A',
  altri_crediti: 'SP_A',
  liquidita: 'SP_A',
  patrimonio_netto: 'SP_P',
  debiti: 'SP_P',
  debiti_finanziari: 'SP_P',
  debiti_tributari: 'SP_P',
  tfr_fondi: 'SP_P',
  fondi_ammortamento: 'SP_P',
  ricavi: 'CE',
  costi_personale: 'CE',
  acquisti_costi: 'CE',
  oneri_finanziari: 'CE',
};

function pdfSectionToSchema(pdf_section) {
  if (pdf_section === 'SP_A') return 'SP_A';
  if (pdf_section === 'SP_P') return 'SP_P';
  if (pdf_section === 'CE' || pdf_section === 'CE_C' || pdf_section === 'CE_R') return 'CE';
  return null;
}

function auditAreaFromPdfSection(pdf_section, fallbackArea) {
  if (pdf_section === 'CE_R') return 'ricavi';
  if (pdf_section === 'CE_C' && fallbackArea === 'ricavi') return 'acquisti_costi';
  return fallbackArea;
}

function enrichLocally(entry) {
  const area = classifyAccount(entry.account_name);
  const schemaFromLayout = pdfSectionToSchema(entry.pdf_section);
  const schemaFromArea = AREA_TO_SCHEMA[area] ?? null;
  return {
    ...entry,
    voce_standard: null,
    schema_civilistico: schemaFromLayout ?? schemaFromArea,
    audit_area: auditAreaFromPdfSection(entry.pdf_section, area),
  };
}

function filterEntries(entries) {
  return entries.filter(
    (e) => e.balance !== 0 && e.account_name.trim().length > 2,
  );
}

const GEMINI_PROMPT_TEMPLATE = `Sei un esperto contabile italiano specializzato in revisione legale. Mappa le seguenti voci di un bilancio di verifica italiano secondo il codice civile (artt. 2424-2425 c.c.).
Per ogni voce restituisci:
- voce_standard: la voce civilistica esatta (vedi regole sotto)
- schema: "SP_A" (stato patrimoniale attivo) | "SP_P" (stato patrimoniale passivo) | "CE" (conto economico) | "MEMO"
- audit_area: una tra [immobilizzazioni|fondi_ammortamento|rimanenze|crediti|altri_crediti|liquidita|patrimonio_netto|debiti|debiti_finanziari|debiti_tributari|tfr_fondi|ricavi|costi_personale|acquisti_costi|oneri_finanziari|altri]

═══ REGOLE VOCE STANDARD — IMMOBILIZZAZIONI IMMATERIALI (SP Attivo B.I) ═══
- "Costi di impianto", "costi d'impianto", "costi di ampliamento" → B.I.1 Costi di impianto e di ampliamento
- "Diritti brevetto", "brevetti", "opere dell'ingegno", "software", "licenze software" → B.I.3 Diritti di brevetto industriale e diritti di utilizzazione delle opere dell'ingegno
- "Marchi", "concessioni", "licenze" → B.I.4 Concessioni, licenze, marchi e diritti simili
- "Avviamento" → B.I.5 Avviamento
- "Costi pluriennali", "altri costi immateriali" → B.I.7 Altre immobilizzazioni immateriali

═══ REGOLE VOCE STANDARD — IMMOBILIZZAZIONI MATERIALI (SP Attivo B.II) ═══
- "Terreni", "fabbricati", "immobili" → B.II.1 Terreni e fabbricati
- "Impianti produttivi", "macchinari produttivi" → B.II.2 Impianti e macchinari
- "Attrezzature industriali", "attrezzature commerciali" → B.II.3 Attrezzature industriali e commerciali
- "Macchine d'ufficio", "computer", "hardware", "telefonia", "arredamento", "mobili", "veicoli", "automezzi" → B.II.4 Altri beni
- "Immobilizzazioni in corso" → B.II.5 Immobilizzazioni materiali in corso e acconti

═══ REGOLE VOCE STANDARD — CREDITI ATTIVO CIRCOLANTE (SP Attivo C.II) ═══
- "Clienti", "crediti verso clienti", "crediti commerciali" → C.II.1 Crediti verso clienti
- "Crediti tributari", "credito IVA", "erario c/IVA", "acconti IRES", "acconti IRAP" → C.II.5-bis Crediti tributari
- "Anticipi a fornitori", "depositi cauzionali attivi" → C.II.5 Altri crediti

═══ REGOLE VOCE STANDARD — DISPONIBILITÀ LIQUIDE (SP Attivo C.IV) ═══
- "Banca", "cassa", "c/c", "conto corrente", "depositi bancari" → C.IV.2 Depositi bancari e postali
- "Cassa" → C.IV.1 Depositi in cassa

═══ REGOLE VOCE STANDARD — RATEI E RISCONTI (SP Attivo D) ═══
- "Risconti attivi", "ratei attivi" → D Ratei e risconti attivi

═══ REGOLE VOCE STANDARD — PASSIVO (SP Passivo) ═══
- "Capitale sociale" → A.I Capitale
- "Riserva legale" → A.IV Riserva legale
- "Utile del periodo", "utile d'esercizio" → A.IX Utile (perdita) dell'esercizio
- "Finanziamenti bancari", "mutui", "anticipi bancari" → D.4 Debiti verso banche
- "Fornitori" → D.7 Debiti verso fornitori
- "Anticipi da clienti", "acconti da clienti" → D.6 Acconti
- "Debiti tributari", "IVA a debito", "IRES da versare", "IRAP da versare" → D.12 Debiti tributari
- "INPS", "INAIL", "ritenute da versare" → D.13 Debiti verso istituti previdenziali

═══ REGOLE FONDI AMMORTAMENTO ═══
- Voci con "F.do amm", "Fondo ammortamento" → schema="SP_P", audit_area="fondi_ammortamento"

═══ REGOLE CONTO ECONOMICO ═══
- Ricavi vendite, proventi, interessi attivi → audit_area="ricavi"
- Acquisti, servizi, consulenze, spese → audit_area="acquisti_costi"
- Salari, stipendi, contributi → audit_area="costi_personale"
- Interessi passivi, perdite su cambi → audit_area="oneri_finanziari"

Voci da mappare: ENTRIES_PLACEHOLDER

Rispondi SOLO con un JSON array senza markdown: [{"c":"...","voce_standard":"...","schema":"...","audit_area":"..."}]`;

async function mapBilancioWithGemini(entries) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurata');

  const filtered = filterEntries(entries);
  if (filtered.length === 0) {
    return entries.map(enrichLocally);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

  const compact = filtered.map((e) => ({
    c: e.account_code ?? '',
    n: e.account_name.trim(),
    v: e.balance,
  }));

  const prompt = GEMINI_PROMPT_TEMPLATE.replace(
    'ENTRIES_PLACEHOLDER',
    JSON.stringify(compact),
  );

  const attemptErrors = [];
  const START = Date.now();
  const TOTAL_BUDGET_MS = 52_000;
  const FIRST_ATTEMPT_MS = 40_000;

  for (const modelName of MODELS) {
    const elapsed = Date.now() - START;
    const remaining = TOTAL_BUDGET_MS - elapsed;
    if (remaining < 8_000) {
      attemptErrors.push(`[${modelName}] budget tempo esaurito (rimanenti ${remaining}ms)`);
      break;
    }
    const attemptTimeoutMs = Math.min(
      modelName === MODELS[0] ? FIRST_ATTEMPT_MS : remaining - 2_000,
      remaining - 2_000,
    );

    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`timeout ${Math.round(attemptTimeoutMs / 1000)}s`)), attemptTimeoutMs),
        ),
      ]);

      const raw = result.response.text().trim()
        .replace(/^```json?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let mapped;
      try {
        mapped = JSON.parse(raw);
      } catch {
        return entries.map(enrichLocally);
      }

      const byCode = {};
      for (const m of mapped) {
        byCode[m.c] = m;
      }

      return entries.map((e, i) => {
        const key = e.account_code ?? String(i);
        const gm = byCode[key];
        if (!gm) return enrichLocally(e);

        const schemaFromAI = VALID_SCHEMAS.includes(gm.schema) ? gm.schema : null;
        const schemaFromLayout = pdfSectionToSchema(e.pdf_section);
        const aiArea = VALID_AREAS.includes(gm.audit_area) ? gm.audit_area : classifyAccount(e.account_name);

        return {
          ...e,
          voce_standard: gm.voce_standard || null,
          schema_civilistico: schemaFromLayout ?? schemaFromAI,
          audit_area: auditAreaFromPdfSection(e.pdf_section, aiArea),
        };
      });
    } catch (err) {
      attemptErrors.push(`[${modelName}] ${err.message ?? String(err)}`);
    }
  }

  throw new Error(`Tutti i modelli Gemini hanno fallito:\n${attemptErrors.join('\n')}`);
}

module.exports = { mapBilancioWithGemini, enrichLocally, enrichAllLocally: (entries) => entries.map(enrichLocally) };
