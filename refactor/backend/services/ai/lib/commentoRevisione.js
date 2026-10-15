'use strict';

/**
 * Commento professionale (Gemini) sui riscontri di revisione GIÀ CALCOLATI.
 *
 * Il modello NON produce numeri e non emette verdetti: valori, scostamenti ed esiti
 * arrivano dalla riconciliazione deterministica e non vengono rimessi in discussione.
 * Qui gli si chiede l'unica cosa che sa fare meglio del codice: dire a un revisore
 * cosa significano quei risultati e cosa fare dopo.
 *
 * È tollerante ai guasti: senza commento la revisione resta completa.
 */

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const PROMPT = `Sei un revisore legale italiano esperto. Ti vengono forniti i RISULTATI GIÀ CALCOLATI di una revisione trimestrale: la riconciliazione fra il bilancio e la documentazione a corredo, e un insieme di INDICATORI DI SALUTE (redditività, equilibrio commerciale, struttura finanziaria) con gli INDICI DI SINTESI ROS, ROI, ROE e oneri finanziari / ricavi. Tutti i calcoli sono deterministici e corretti: NON metterli in discussione e NON rifarli.

Il tuo compito è solo interpretativo:
- Per ogni voce riscontrata, scrivi un commento di 1-2 frasi rivolto al revisore: cosa significa l'esito, quanto è grave, cosa conviene fare o chiedere alla società.
- Non ripetere pedissequamente i numeri: sono già a schermo. Citane uno solo se serve a dare la misura del problema.
- Non inventare importi, conti o documenti che non compaiono nei dati forniti.
- Dove l'esito è "ok", sii breve. Dove è "scostamento" o "non_verificabile", indica causa probabile e passo successivo concreto.

Fornisci una "sintesi" di 2-4 frasi sullo stato complessivo della revisione (cosa quadra, cosa no, il rilievo più urgente).

Fornisci infine un "giudizio_salute" di 3-5 frasi sulla salute economico-finanziaria dell'azienda, basato SOLO sugli indicatori e sugli indici forniti e sul loro stato già calcolato; cita ROI, ROE e la sostenibilità degli oneri finanziari quando sono valorizzati. Ricorda che è la fotografia di un solo trimestre: non parlare di tendenze o andamenti. Collega, dove pertinente, la salute ai rilievi della riconciliazione (es. un'IVA a debito sottostimata pesa sui debiti reali). Tono professionale e asciutto, in italiano, senza formule di cortesia.

DATI:
DATI_PLACEHOLDER`;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    sintesi: { type: SchemaType.STRING },
    giudizio_salute: { type: SchemaType.STRING },
    commenti: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          codice: { type: SchemaType.STRING },
          commento: { type: SchemaType.STRING },
        },
        required: ['codice', 'commento'],
      },
    },
  },
  required: ['sintesi', 'commenti'],
};

async function commentoRevisione(riscontri, meta, salute) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurata');
  if (!Array.isArray(riscontri) || riscontri.length === 0) {
    return { sintesi: null, giudizio_salute: null, commenti: {} };
  }

  const prompt = PROMPT.replace(
    'DATI_PLACEHOLDER',
    JSON.stringify({ societa: meta ?? {}, riscontri, salute: salute ?? null }, null, 1)
  );

  const genAI = new GoogleGenerativeAI(apiKey);
  const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  const errori = [];

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2, // un filo di naturalezza nel testo; i numeri non dipendono da qui
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
      const commenti = {};
      for (const c of parsed.commenti ?? []) {
        if (c?.codice && typeof c.commento === 'string') commenti[c.codice] = c.commento;
      }
      return {
        sintesi: typeof parsed.sintesi === 'string' ? parsed.sintesi : null,
        giudizio_salute: typeof parsed.giudizio_salute === 'string' ? parsed.giudizio_salute : null,
        commenti,
      };
    } catch (err) {
      errori.push(`[${modelName}] ${err.message ?? String(err)}`);
    }
  }

  throw new Error(`Commento AI fallito: ${errori.join('; ')}`);
}

module.exports = { commentoRevisione };
