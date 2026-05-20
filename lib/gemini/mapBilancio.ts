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

  const prompt = `Sei un esperto contabile italiano specializzato in revisione legale. Mappa le seguenti voci di un bilancio di verifica italiano secondo il codice civile (artt. 2424-2425 c.c.).
Per ogni voce restituisci:
- voce_standard: la voce civilistica esatta (vedi regole sotto)
- schema: "SP_A" (stato patrimoniale attivo) | "SP_P" (stato patrimoniale passivo) | "CE" (conto economico) | "MEMO"
- audit_area: una tra [${VALID_AREAS.join("|")}]

═══ REGOLE VOCE STANDARD — IMMOBILIZZAZIONI IMMATERIALI (SP Attivo B.I) ═══
- "Costi di impianto", "costi d'impianto", "costi di ampliamento" → B.I.1 Costi di impianto e di ampliamento
- "Costi di ricerca", "costi di sviluppo", "pubblicità" → B.I.2 Costi di ricerca, di sviluppo e di pubblicità
- "Diritti brevetto", "brevetti", "opere dell'ingegno", "software", "licenze software" → B.I.3 Diritti di brevetto industriale e diritti di utilizzazione delle opere dell'ingegno
- "Marchi", "concessioni", "licenze" → B.I.4 Concessioni, licenze, marchi e diritti simili
- "Avviamento" → B.I.5 Avviamento
- "Costi pluriennali", "altri costi immateriali" → B.I.7 Altre immobilizzazioni immateriali

═══ REGOLE VOCE STANDARD — IMMOBILIZZAZIONI MATERIALI (SP Attivo B.II) ═══
- "Terreni", "fabbricati", "immobili" → B.II.1 Terreni e fabbricati
- "Impianti produttivi", "macchinari produttivi" → B.II.2 Impianti e macchinari
- "Attrezzature industriali", "attrezzature commerciali" → B.II.3 Attrezzature industriali e commerciali
- "Macchine d'ufficio", "computer", "hardware", "telefonia", "arredamento", "mobili", "veicoli", "automezzi", "altre immobilizzazioni materiali" → B.II.4 Altri beni (NON B.II.2)
- "Immobilizzazioni in corso" → B.II.5 Immobilizzazioni materiali in corso e acconti

═══ REGOLE VOCE STANDARD — CREDITI ATTIVO CIRCOLANTE (SP Attivo C.II) ═══
- "Clienti", "crediti verso clienti", "crediti commerciali" → C.II.1 Crediti verso clienti
- "Crediti tributari", "credito IVA", "erario c/IVA", "erario c/liquidazione IVA", "acconti IRES", "acconti IRAP", "crediti verso erario" → C.II.5-bis Crediti tributari
  ATTENZIONE: se la voce è in SP Attivo (schema="SP_A"), usa SEMPRE C.II.5-bis, mai D.12 o voci passive.
- "Anticipi a fornitori" → C.II.5 Altri crediti
- "Depositi cauzionali attivi" → C.II.5 Altri crediti

═══ REGOLE VOCE STANDARD — RATEI E RISCONTI (SP Attivo D) ═══
- "Risconti attivi", "ratei attivi" → D Ratei e risconti attivi
  ATTENZIONE: NON usare C.IV.2 per ratei/risconti. C.IV riguarda disponibilità liquide (banche, cassa).

═══ REGOLE VOCE STANDARD — DISPONIBILITÀ LIQUIDE (SP Attivo C.IV) ═══
- "Banca", "cassa", "c/c", "conto corrente", "depositi bancari" → C.IV.2 Depositi bancari e postali
- "Cassa" → C.IV.1 Depositi in cassa

═══ REGOLE VOCE STANDARD — PASSIVO (SP Passivo) ═══
- "Capitale sociale" → A.I Capitale
- "Riserva legale" → A.IV Riserva legale
- "Altre riserve" → A.VII Altre riserve
- "Utili portati a nuovo", "risultati portati a nuovo" → A.VIII Utili (perdite) portati a nuovo
- "Utile del periodo", "utile d'esercizio" → A.IX Utile (perdita) dell'esercizio
- "Finanziamenti bancari", "mutui", "anticipi bancari", "Ri.Ba" → D.4 Debiti verso banche
- "Fornitori" → D.7 Debiti verso fornitori
- "Anticipi da clienti", "acconti da clienti", "fondi spese clienti" → D.6 Acconti (NON D.7 fornitori)
- "Debiti tributari", "erario c/imposte da versare", "IVA a debito", "IRES da versare", "IRAP da versare", "bollo su fatture" → D.12 Debiti tributari
- "Debiti previdenziali", "INPS", "INAIL", "ritenute da versare" → D.13 Debiti verso istituti previdenziali
- "Soci c/utili", "utili da distribuire" → D.14 Altri debiti

═══ REGOLE VOCE STANDARD — FONDI AMMORTAMENTO ═══
- Voci con "F.do amm", "Fondo ammortamento", "F.do ammort" → schema="SP_P", audit_area="fondi_ammortamento"
- voce_standard per i fondi: es. "Fondo amm. B.I.1 Costi di impianto", "Fondo amm. B.II.1 Fabbricati"
  Indica sempre il cespite corrispondente.

═══ REGOLE CONTO ECONOMICO ═══
- Ricavi delle vendite, proventi, interessi attivi, dividendi, utili su cambi → audit_area="ricavi"
- Acquisti, servizi, trasporti, consulenze, spese generali → audit_area="acquisti_costi"
- Salari, stipendi, contributi → audit_area="costi_personale"
- Interessi passivi, perdite su cambi, svalutazioni → audit_area="oneri_finanziari"
NON classificare mai "Trasporti su vendite" o simili come ricavi: sono costi di servizio.

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
