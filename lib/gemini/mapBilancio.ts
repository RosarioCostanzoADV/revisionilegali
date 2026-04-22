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
  "immobilizzazioni", "rimanenze", "crediti", "altri_crediti", "liquidita",
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
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

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

Voci da mappare: ${JSON.stringify(compact)}

Rispondi SOLO con un JSON array senza markdown: [{"c":"...","voce_standard":"...","schema":"...","audit_area":"..."}]`;

  let lastError: Error = new Error("No models available");

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
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
        return {
          ...e,
          voce_standard: gm.voce_standard || null,
          schema_civilistico: (VALID_SCHEMAS.includes(gm.schema as SchemaCivilistico) ? gm.schema : null) as SchemaCivilistico | null,
          audit_area: VALID_AREAS.includes(gm.audit_area) ? gm.audit_area : classifyAccount(e.account_name),
        };
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError;
}

export function enrichLocally(entry: ParsedEntry): EnrichedEntry {
  return {
    ...entry,
    voce_standard: null,
    schema_civilistico: null,
    audit_area: classifyAccount(entry.account_name),
  };
}

export function enrichAllLocally(entries: ParsedEntry[]): EnrichedEntry[] {
  return entries.map(enrichLocally);
}
