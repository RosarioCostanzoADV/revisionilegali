import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedEntry } from "@/lib/accounting/parsers";
import { classifyAccount } from "@/lib/audit/classification";

export type SchemaCivilistico = "SP_A" | "SP_P" | "CE" | "MEMO";

export interface EnrichedEntry extends ParsedEntry {
  voce_standard: string | null;
  schema_civilistico: SchemaCivilistico | null;
  audit_area: string;
}

const VALID_SCHEMAS: SchemaCivilistico[] = ["SP_A", "SP_P", "CE", "MEMO"];
const VALID_AREAS = [
  "immobilizzazioni", "fondi_ammortamento", "rimanenze", "crediti", "altri_crediti", "liquidita",
  "patrimonio_netto", "debiti", "debiti_finanziari", "debiti_tributari",
  "tfr_fondi", "ricavi", "costi_personale", "acquisti_costi", "oneri_finanziari", "altri",
];

function filterEntries(entries: ParsedEntry[]): ParsedEntry[] {
  return entries.filter(
    (e) => e.balance !== 0 && e.account_name.trim().length > 2,
  );
}

export async function mapBilancioWithGemini(
  entries: ParsedEntry[],
): Promise<EnrichedEntry[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurata");

  const filtered = filterEntries(entries);
  if (filtered.length === 0) {
    return entries.map((e) => enrichLocally(e));
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Su Vercel Hobby il budget totale è 60s: usare 4 modelli in fallback
  // significa timeout strettissimi che su free tier fanno fallire tutto.
  // Meglio un singolo tentativo generoso sul modello più veloce, poi un
  // fallback più leggero se c'è tempo residuo.
  const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

  const compact = filtered.map((e) => ({
    c: e.account_code ?? "",
    n: e.account_name.trim(),
    v: e.balance,
  }));

  const prompt = `Sei un esperto contabile italiano. Mappa le seguenti voci di un bilancio di verifica italiano secondo il codice civile (artt. 2424-2425 c.c.).
Per ogni voce restituisci:
- voce_standard: la voce civilistica (es. "B.II.2 Impianti e macchinari", "A.1 Ricavi delle vendite")
- schema: "SP_A" (stato patrimoniale attivo) | "SP_P" (stato patrimoniale passivo) | "CE" (conto economico) | "MEMO"
- audit_area: una tra [${VALID_AREAS.join("|")}]

REGOLA IMPORTANTE per CE (conto economico): l'area distingue ricavi da costi.
- Interessi attivi, proventi finanziari, dividendi, utili su cambi, plusvalenze → audit_area="ricavi" (sono componenti positive di reddito, vanno lato ricavi)
- Interessi passivi, oneri finanziari, perdite su cambi, svalutazioni → audit_area="oneri_finanziari" (lato costi)
Non mettere mai "oneri_finanziari" su una voce di provento/ricavo finanziario.

REGOLA IMPORTANTE per FONDI AMMORTAMENTO: voci il cui nome inizia con "F.do amm", "Fondo ammortamento", "F.do ammort" sono fondi di ammortamento dei cespiti. Vanno SEMPRE in audit_area="fondi_ammortamento" e schema="SP_P" (rettifiche dell'attivo portate al passivo), MAI in "immobilizzazioni" anche se la descrizione contiene termini come "fabbricati", "marchi", "impianti", "macchine".

Voci da mappare: ${JSON.stringify(compact)}

Rispondi SOLO con un JSON array senza markdown: [{"c":"...","voce_standard":"...","schema":"...","audit_area":"..."}]`;

  const attemptErrors: string[] = [];
  // Vercel Hobby: 60s budget. Lasciamo 8s per parsing + response → 52s AI.
  // Primo tentativo generoso (40s) sul modello principale; se fallisce,
  // secondo tentativo col tempo residuo sul lite (almeno 8s).
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
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`timeout ${Math.round(attemptTimeoutMs / 1000)}s`)), attemptTimeoutMs),
        ),
      ]);
      const raw = result.response.text().trim()
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let mapped: Array<{ c: string; voce_standard: string; schema: string; audit_area: string }>;
      try {
        mapped = JSON.parse(raw);
      } catch {
        return entries.map((e) => enrichLocally(e));
      }

      const byCode: Record<string, { voce_standard: string; schema: string; audit_area: string }> = {};
      for (const m of mapped) {
        byCode[m.c] = m;
      }

      return entries.map((e, i) => {
        const key = e.account_code ?? String(i);
        const gm = byCode[key];
        if (!gm) return enrichLocally(e);
        // Il layout PDF ha priorità sullo schema AI:
        // se parsePDF ha rilevato la sezione, non la sovrascriviamo con l'AI.
        const schemaFromAI = (VALID_SCHEMAS.includes(gm.schema as SchemaCivilistico) ? gm.schema : null) as SchemaCivilistico | null;
        const schemaFromLayout = pdfSectionToSchema(e.pdf_section);
        return {
          ...e,
          voce_standard: gm.voce_standard || null,
          schema_civilistico: schemaFromLayout ?? schemaFromAI,
          audit_area: VALID_AREAS.includes(gm.audit_area) ? gm.audit_area : classifyAccount(e.account_name),
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attemptErrors.push(`[${modelName}] ${msg}`);
    }
  }

  throw new Error(`Tutti i modelli Gemini hanno fallito:\n${attemptErrors.join("\n")}`);
}

/** Converte la sezione PDF in schema civilistico. */
function pdfSectionToSchema(pdf_section: string | undefined | null): SchemaCivilistico | null {
  if (pdf_section === "SP_A") return "SP_A";
  if (pdf_section === "SP_P") return "SP_P";
  if (pdf_section === "CE") return "CE";
  return null;
}

// Mappatura deterministica audit_area → schema_civilistico, usata come
// fallback quando l'AI non è disponibile. Permette almeno di suddividere
// SP Attivo / SP Passivo / CE anche senza mappatura civilistica AI.
const AREA_TO_SCHEMA: Record<string, SchemaCivilistico> = {
  immobilizzazioni: "SP_A",
  rimanenze: "SP_A",
  crediti: "SP_A",
  altri_crediti: "SP_A",
  liquidita: "SP_A",
  patrimonio_netto: "SP_P",
  debiti: "SP_P",
  debiti_finanziari: "SP_P",
  debiti_tributari: "SP_P",
  tfr_fondi: "SP_P",
  fondi_ammortamento: "SP_P",
  ricavi: "CE",
  costi_personale: "CE",
  acquisti_costi: "CE",
  oneri_finanziari: "CE",
};

export function enrichLocally(entry: ParsedEntry): EnrichedEntry {
  const area = classifyAccount(entry.account_name);
  // pdf_section (rilevato dal layout del documento) ha priorità sulla
  // classificazione per keyword: evita false discrepanze di quadratura
  // quando conti ambigui (es. conto 35 – Erario) si trovano nello SP Attivo
  // ma verrebbero classificati come debiti tributari dalle sole keyword.
  const schemaFromLayout = pdfSectionToSchema(entry.pdf_section);
  const schemaFromArea = AREA_TO_SCHEMA[area] ?? null;
  return {
    ...entry,
    voce_standard: null,
    schema_civilistico: schemaFromLayout ?? schemaFromArea,
    audit_area: area,
  };
}

export function enrichAllLocally(entries: ParsedEntry[]): EnrichedEntry[] {
  return entries.map(enrichLocally);
}
