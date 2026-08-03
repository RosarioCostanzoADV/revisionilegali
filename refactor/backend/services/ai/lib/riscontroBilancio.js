'use strict';

/**
 * Riscontro AI (Gemini) delle voci chiave del bilancio trimestrale con i file a
 * corredo (registri fatture, mastrini, F24/registri IVA...).
 *
 * Riceve:
 *   - figure: valori chiave estratti in modo deterministico dal bilancio
 *   - corredo: estratti testuali dei documenti a corredo ({name, category, excerpt})
 * Restituisce un array di riscontri:
 *   { voce, valore_bilancio, fonte, valore_riscontrato, esito, scostamento, commento }
 * esito ∈ { "ok" | "scostamento" | "non_verificabile" }
 *
 * È tollerante ai guasti: se Gemini non è disponibile restituisce riscontri
 * "non_verificabile" (l'analisi delle anomalie resta comunque deterministica lato accounting).
 */

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

// Soglie oltre le quali lo scostamento non è più trascurabile.
const TOLLERANZA_ASSOLUTA = 100;   // €
const TOLLERANZA_RELATIVA = 0.01;  // 1% del valore di bilancio

/**
 * L'esito NON è una valutazione del modello: è una funzione dei due numeri.
 * A parità di valori il verdetto è sempre identico — è questo che impedisce a
 * una stessa voce di risultare "ok" in un'esecuzione e "scostamento" in quella dopo.
 */
function calcolaEsito(valoreBilancio, valoreRiscontrato) {
  if (valoreBilancio == null || valoreRiscontrato == null) {
    return { esito: 'non_verificabile', scostamento: null };
  }
  const scostamento = +(valoreBilancio - valoreRiscontrato).toFixed(2);
  const diff = Math.abs(scostamento);
  const trascurabile =
    diff < TOLLERANZA_ASSOLUTA || diff < Math.abs(valoreBilancio) * TOLLERANZA_RELATIVA;
  return { esito: trascurabile ? 'ok' : 'scostamento', scostamento };
}

/** Accetta 71635.24, "71.635,24", "€ 71,635.24" — il modello non è coerente sul formato. */
function parseImporto(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().replace(/[€\s]/g, '');
  if (!s) return null;
  // Con decimali dopo la virgola è formato italiano (1.234,56); altrimenti inglese.
  s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const normalizzaVoce = (v) => String(v ?? '').trim().toLowerCase();

function fallbackRiscontri(figure) {
  return (figure?.controlli ?? []).map((c) => ({
    voce: c.voce,
    valore_bilancio: c.valore_bilancio,
    fonte: null,
    valore_riscontrato: null,
    esito: 'non_verificabile',
    scostamento: null,
    commento: 'Riscontro automatico non disponibile (servizio AI non raggiungibile).',
  }));
}

// Il modello fa SOLO estrazione: individua nei documenti gli importi da usare e li
// trascrive. Somma, confronto, scostamento ed esito sono calcolati in codice.
// Al modello NON viene detto quanto vale la voce a bilancio: se lo sapesse tenderebbe
// a "ritrovare" proprio quel numero invece di leggerlo davvero (conferma per ancoraggio),
// e il riscontro smetterebbe di essere una verifica indipendente.
const PROMPT_TEMPLATE = `Sei un revisore legale italiano. Per ciascuna VOCE elencata, cerca nei DOCUMENTI A CORREDO (registri fatture, mastrini, liquidazioni IVA/F24) gli importi che compongono il saldo di quella voce.

Regole tassative:
- In "valori_utilizzati" metti SOLO importi trascritti alla lettera dai documenti. Mai un numero calcolato, stimato o dedotto: il sistema verifica che ogni importo compaia davvero nel testo e scarta quelli inventati.
- NON sommare e NON fare aritmetica. Se il saldo del trimestre risulta da più totali mensili, elencali tutti in "valori_utilizzati": alla somma pensa il sistema.
- Nei registri IVA la riga "TOTALI" riporta, in ordine: totale documento | imponibile | imposta. Per le voci IVA usa l'IMPOSTA, non il totale documento.
- Per un saldo di fine trimestre servono i totali di TUTTI i mesi del trimestre (se il registro è già cumulativo/progressivo, usa il solo totale progressivo).
- Se nei documenti non c'è nulla di confrontabile, lascia "valori_utilizzati" vuoto. È un esito legittimo e preferibile a un numero inventato.
- In "fonte" indica il documento da cui hai preso gli importi; in "commento" spiega in una riga quali totali hai usato e perché.

Restituisci un elemento per ogni voce elencata, con la stessa identica stringa "voce".

VOCI DA RISCONTRARE:
FIGURE_PLACEHOLDER

DOCUMENTI A CORREDO (estratti di testo, i totali sono di norma in fondo):
CORREDO_PLACEHOLDER`;

const RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      voce: { type: SchemaType.STRING },
      fonte: { type: SchemaType.STRING, nullable: true },
      valori_utilizzati: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
      commento: { type: SchemaType.STRING },
    },
    required: ['voce', 'valori_utilizzati', 'commento'],
  },
};

/**
 * Insieme degli importi che compaiono ALLA LETTERA nei documenti a corredo.
 * È la rete di sicurezza contro l'invenzione: un importo che il modello non ha
 * letto ma prodotto (una somma fatta a mente, o il valore di bilancio riecheggiato)
 * non è qui dentro, e viene scartato.
 */
function importiPresenti(corredo) {
  const presenti = new Set();
  const re = /-?\d{1,3}(?:\.\d{3})*,\d{2}/g;
  for (const d of corredo ?? []) {
    // I moduli LIPE/F24 stampano i decimali in caselle staccate ("86.177 2 0"):
    // vanno ricomposti, o gli importi non risultano presenti e il riscontro IVA
    // verrebbe scartato a torto. (accounting normalizza già, qui per sicurezza.)
    const testo = String(d.excerpt ?? '').replace(/(\d{1,3}(?:\.\d{3})+)\s(\d)\s(\d)(?!\d)/g, '$1,$2$3');
    for (const t of testo.match(re) ?? []) {
      const n = parseImporto(t);
      if (n != null) presenti.add(Math.abs(n).toFixed(2));
    }
  }
  return presenti;
}

async function riscontroWithGemini(figure, corredo) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurata');

  const controlli = figure?.controlli ?? [];
  if (controlli.length === 0) return [];

  // Nessun valore_bilancio: al modello non va rivelato il numero da "confermare".
  const figureCompact = controlli.map((c) => ({
    voce: c.voce,
    dettaglio: c.dettaglio ?? undefined,
  }));

  const corredoCompact = (corredo ?? []).map((d) => ({
    documento: d.name,
    categoria: d.category,
    testo: (d.excerpt ?? '').slice(0, 6000),
  }));

  const prompt = PROMPT_TEMPLATE
    .replace('FIGURE_PLACEHOLDER', JSON.stringify(figureCompact))
    .replace('CORREDO_PLACEHOLDER', JSON.stringify(corredoCompact));

  const genAI = new GoogleGenerativeAI(apiKey);
  const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  const attemptErrors = [];

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          // Default di Gemini = 1.0 (campionamento attivo): a parità di input la
          // risposta cambia da un'esecuzione all'altra. Qui serve riproducibilità.
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
        .replace(/^```json?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        attemptErrors.push(`[${modelName}] risposta non JSON`);
        continue;
      }
      if (!Array.isArray(parsed)) {
        attemptErrors.push(`[${modelName}] risposta non array`);
        continue;
      }

      // L'elenco autoritativo è `controlli` (estratto dal bilancio in modo
      // deterministico), non l'array del modello: così una voce non può sparire,
      // duplicarsi o finire abbinata ai numeri di un'altra se il modello cambia
      // ordine o lunghezza della risposta.
      const perVoce = new Map();
      parsed.forEach((r, i) => {
        const k = normalizzaVoce(r?.voce);
        if (k && !perVoce.has(k)) perVoce.set(k, r);
        // Il modello a volte riscrive leggermente la voce: teniamo l'indice come ripiego.
        perVoce.set(`#${i}`, perVoce.get(`#${i}`) ?? r);
      });

      const presenti = importiPresenti(corredo);

      return controlli.map((c, i) => {
        const r = perVoce.get(normalizzaVoce(c.voce)) ?? perVoce.get(`#${i}`) ?? {};
        // valore_bilancio viene sempre dal bilancio, mai dal modello.
        const valoreBilancio = c.valore_bilancio ?? null;

        // Tiene solo gli importi che compaiono davvero nei documenti.
        const dichiarati = (Array.isArray(r.valori_utilizzati) ? r.valori_utilizzati : [])
          .map(parseImporto)
          .filter((n) => n != null);
        const usati = dichiarati.filter((n) => presenti.has(Math.abs(n).toFixed(2)));
        const scartati = dichiarati.length - usati.length;

        // La somma la fa il codice: l'aritmetica del modello non è affidabile.
        const valoreRiscontrato = usati.length
          ? +usati.reduce((s, n) => s + n, 0).toFixed(2)
          : null;

        const { esito, scostamento } = calcolaEsito(valoreBilancio, valoreRiscontrato);

        let commento = typeof r.commento === 'string' ? r.commento : '';
        if (scartati > 0) {
          commento += `${commento ? ' ' : ''}[${scartati} importo/i indicati dall'AI non compaiono nei documenti: scartati.]`;
        }

        return {
          voce: c.voce,
          valore_bilancio: valoreBilancio,
          fonte: valoreRiscontrato != null && r.fonte ? String(r.fonte) : null,
          valore_riscontrato: valoreRiscontrato,
          valori_utilizzati: usati,
          esito,
          scostamento,
          commento,
        };
      });
    } catch (err) {
      attemptErrors.push(`[${modelName}] ${err.message ?? String(err)}`);
    }
  }

  throw new Error(`Gemini riscontro fallito: ${attemptErrors.join('; ')}`);
}

module.exports = { riscontroWithGemini, fallbackRiscontri };
