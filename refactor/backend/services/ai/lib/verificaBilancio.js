'use strict';

/**
 * Verifica (Gemini) se il bilancio caricato per il 4° trimestre è il bilancio
 * ANNUALE (chiusura d'esercizio, 12 mesi) e non un bilancio trimestrale/infrannuale.
 *
 * Perché serve l'AI e non solo un controllo deterministico: la data di chiusura
 * ("BILANCIO AL 31/12/AAAA") è identica sia per il bilancio annuale sia per un
 * eventuale bilancio del solo 4° trimestre — la data da sola non distingue i due casi.
 * Il segnale deterministico più forte che abbiamo (presenza del Conto Economico) viene
 * comunque passato al modello come evidenza, ma la decisione finale è qualitativa:
 * legge il testo del documento per cercare altri indizi (riferimenti a "esercizio",
 * "nota integrativa", periodi diversi dal singolo trimestre, ecc.).
 *
 * Come per commentoRevisione: l'AI non produce né corregge numeri, giudica solo il
 * TIPO di documento.
 */

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const PROMPT = `Sei un revisore legale italiano esperto di bilanci. Devi stabilire se il documento fornito è il BILANCIO ANNUALE D'ESERCIZIO (chiusura riferita ai 12 mesi dell'anno, es. 01/01-31/12) oppure un bilancio INFRANNUALE/TRIMESTRALE (situazione contabile parziale riferita a un singolo trimestre).

Indizi utili (nessuno da solo è decisivo, valutali insieme):
- La data di chiusura da sola NON basta: sia il bilancio annuale sia un eventuale bilancio del 4° trimestre riportano una data a fine anno (31/12).
- Il Conto Economico completo (ricavi, costi, risultato d'esercizio) è tipicamente presente SOLO nel bilancio annuale; i bilanci trimestrali riportano di regola solo lo Stato Patrimoniale.
- Riferimenti espliciti a "esercizio", "nota integrativa", "relazione sulla gestione", "bilancio d'esercizio" indicano documento annuale.
- Riferimenti espliciti a un singolo trimestre o periodo infrannuale indicano documento trimestrale.

Rispondi in modo netto: "annuale" true se sei ragionevolmente sicuro che il documento sia il bilancio d'esercizio annuale, false altrimenti (inclusi i casi dubbi: in caso di dubbio concreto, false). Motiva brevemente (1-2 frasi) in italiano, citando gli indizi trovati nel documento.

DATI:
DATI_PLACEHOLDER`;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    annuale: { type: SchemaType.BOOLEAN },
    motivazione: { type: SchemaType.STRING },
  },
  required: ['annuale', 'motivazione'],
};

// Quanto testo del documento passare al modello: il grosso del segnale utile sta
// nell'intestazione e nelle prime pagine (struttura prospetti, riferimenti testuali).
const MAX_CHARS_TESTO = 6000;

async function verificaBilancioAnnuale({ meta, contoEconomicoPresente, testo }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurata');

  const prompt = PROMPT.replace(
    'DATI_PLACEHOLDER',
    JSON.stringify({
      meta: meta ?? {},
      conto_economico_presente_nel_parsing_automatico: Boolean(contoEconomicoPresente),
      estratto_testo_documento: String(testo ?? '').slice(0, MAX_CHARS_TESTO),
    }, null, 1)
  );

  const genAI = new GoogleGenerativeAI(apiKey);
  const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  const errori = [];

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 45s')), 45_000)),
      ]);

      const raw = result.response.text().trim()
        .replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();

      const parsed = JSON.parse(raw);
      return {
        annuale: Boolean(parsed.annuale),
        motivazione: typeof parsed.motivazione === 'string' ? parsed.motivazione : '',
      };
    } catch (err) {
      errori.push(`[${modelName}] ${err.message ?? String(err)}`);
    }
  }

  throw new Error(`Verifica tipo bilancio fallita: ${errori.join('; ')}`);
}

module.exports = { verificaBilancioAnnuale };
