'use strict';

/**
 * Revisione del trimestre.
 *
 * GET  /api/accounting/review/:quarterId  — restituisce l'ultimo report salvato (se esiste),
 *                                            senza ricalcolare nulla. 404 se non è mai stata
 *                                            eseguita una revisione per questo trimestre.
 * POST /api/accounting/review/:quarterId  — RICALCOLA da capo (lettura documenti + AI) e
 *                                            salva il risultato, sovrascrivendo il precedente.
 *                                            Va invocato solo da un'azione esplicita
 *                                            dell'utente (bottone "Ricalcola"), non al solo
 *                                            caricamento della pagina: è costoso (decine di
 *                                            secondi, chiamate AI incluse).
 *
 * Perno del calcolo: l'unico file di categoria "bilancio" del trimestre.
 *
 * Operazioni:
 *   1. Anomalie Stato Patrimoniale (passività > attività) — deterministico.
 *   2. Anomalie Conto Economico (costi > ricavi) — deterministico (se il CE è presente).
 *   3. Riconciliazione delle voci chiave con i documenti a corredo — DETERMINISTICA.
 *   4. Commento professionale sui risultati — AI (Gemini).
 *
 * Nota di progetto: i NUMERI non passano mai dall'AI. Sul campo il modello ha sbagliato
 * sistematicamente le due cose che qui contano: scegliere la riga giusta in un prospetto
 * (nella LIPE scambiava IVA esigibile e IVA detratta) e fare aritmetica. Legge, somma e
 * confronta il codice; all'AI resta il commento, che è ciò per cui serve davvero.
 */

const { parseBilancioTrimestrale } = require('../lib/bilancioTrimestrale');
const { listDocuments, downloadDocument } = require('../lib/documentClient');
const { costruisciRiscontri, sumByCode } = require('../lib/riconciliazione');
const { valutaSalute } = require('../lib/saluteAzienda');
const { ReviewReport } = require('../models');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:3008';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'change_me_in_production';

/**
 * Chiede all'AI un commento sui riscontri già calcolati. Non lancia mai: il commento è
 * un di più, e la revisione resta valida (e completa) anche senza.
 */
async function callCommentoAI(riscontri, meta, salute) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/commento-revisione`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
      },
      body: JSON.stringify({ riscontri, meta, salute }),
    });
    if (!res.ok) return { commenti: {}, sintesi: null, salute: null, ai_used: false, ai_error: `ai-service ${res.status}` };
    return res.json();
  } catch (err) {
    return { commenti: {}, sintesi: null, salute: null, ai_used: false, ai_error: err.message };
  }
}

/** Errore con status HTTP esplicito, per distinguere i fallimenti attesi (400/502) da bug (500). */
class ReviewError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Il calcolo vero e proprio: legge i documenti, riconcilia, interroga l'AI. Nessuna persistenza qui. */
async function computeReview(quarterId, token) {
  // 1. Documenti del trimestre
  let docs;
  try {
    docs = await listDocuments(quarterId, token);
  } catch (err) {
    console.error('review listDocuments error:', err.message);
    throw new ReviewError(502, 'Impossibile leggere i documenti del trimestre.');
  }

  const bilancioDoc = (docs || []).find((d) => d.category === 'bilancio');
  if (!bilancioDoc) {
    throw new ReviewError(400, 'Nessun bilancio caricato per questo trimestre. Carica prima il bilancio.');
  }

  // 2. Analisi del bilancio (deterministica)
  let analysis;
  try {
    analysis = await parseBilancioTrimestrale(await downloadDocument(bilancioDoc.id, token));
  } catch (err) {
    console.error('review parse bilancio error:', err.message);
    throw new ReviewError(500, 'Errore nell\'analisi del bilancio.');
  }

  const sp = analysis.stato_patrimoniale;
  const ce = analysis.conto_economico;
  const cePresente = ce.totale_costi != null || ce.totale_ricavi != null;

  // 3. Riconciliazione con i documenti a corredo (deterministica)
  let riscontri = [];
  try {
    riscontri = await costruisciRiscontri(
      analysis,
      docs,
      (id) => downloadDocument(id, token),
      analysis.meta?.trimestre
    );
  } catch (err) {
    console.error('review riconciliazione error:', err.message);
  }

  // 4. Salute dell'azienda — la fotografia dei conti dell'azienda. Alimentata con gli
  //    aggregati del BILANCIO (il quadro completo: banche + cassa, tutti i fornitori),
  //    non solo con ciò che è riscontrato: la salute descrive la posizione dichiarata,
  //    la riconciliazione dice quanto fidarsene (sezione riscontri). Le due non vanno confuse.
  const V = analysis.voci ?? [];
  // Per i conti che il bilancio espone su due colonne (2801, 4913) il valore corretto è
  // quello che la riconciliazione ha già separato: `sumByCode` li sommerebbe entrambi.
  // Per cassa e banche, presenti in una sola colonna, `sumByCode` è sicuro.
  const bilancioDi = (codice) => {
    const r = riscontri.find((x) => x.codice === codice);
    return r ? r.valore_bilancio : sumByCode(V, codice);
  };
  const salute = valutaSalute({
    conto_economico: {
      totale_costi: ce.totale_costi,
      totale_ricavi: ce.totale_ricavi,
      risultato_esercizio: ce.risultato_esercizio,
    },
    crediti_clienti: bilancioDi('2801001'),                        // crediti commerciali netti
    debiti_fornitori: bilancioDi('4913001') + bilancioDi('4913510'), // fornitori + terzi
    disponibilita_liquide: sumByCode(V, '3401') + sumByCode(V, '3405'), // banche + cassa
    debiti_banche: sumByCode(V, '4907'),                           // mutui e finanziamenti
  });

  // 5. Commento AI sui riscontri e sulla salute già calcolati (mai sui numeri)
  const commentoAI = await callCommentoAI(
    riscontri.map((r) => ({
      codice: r.codice,
      voce: r.voce,
      valore_bilancio: r.valore_bilancio,
      valore_riscontrato: r.valore_riscontrato,
      esito: r.esito,
      scostamento: r.scostamento,
      fonti: r.prove.map((p) => p.documento),
      note: r.note,
    })),
    analysis.meta,
    salute
  );

  for (const r of riscontri) {
    r.commento_ai = commentoAI.commenti?.[r.codice] ?? null;
  }
  salute.giudizio_ai = commentoAI.salute ?? null;

  return {
    meta: analysis.meta,
    stato_patrimoniale: {
      totale_attivita: sp.totale_attivita,
      totale_passivita: sp.totale_passivita,
      risultato_esercizio: sp.risultato_esercizio,
      tipo_risultato: sp.tipo_risultato,
      anomalia: sp.anomalia,
    },
    conto_economico: {
      presente: cePresente,
      totale_costi: ce.totale_costi,
      totale_ricavi: ce.totale_ricavi,
      risultato_esercizio: ce.risultato_esercizio,
      anomalia: ce.anomalia,
    },
    salute,
    anomalie: analysis.anomalie,
    quadratura: analysis.quadratura,
    riscontri,
    sintesi_ai: commentoAI.sintesi ?? null,
    ai_used: commentoAI.ai_used ?? false,
    ai_error: commentoAI.ai_error ?? null,
    documenti_analizzati: (docs || []).length,
    conteggio_voci: (analysis.voci || []).length,
  };
}

// GET /api/accounting/review/:quarterId — ultimo report salvato, nessun ricalcolo.
async function getReview(req, res) {
  const { quarterId } = req.params;
  if (!quarterId) return res.status(400).json({ error: 'quarterId mancante.' });

  try {
    const saved = await ReviewReport.findOne({
      where: { quarter_id: quarterId, tenant_id: req.user.tenant_id },
    });
    if (!saved) {
      return res.status(404).json({ error: 'Nessuna revisione calcolata per questo trimestre.' });
    }
    return res.json({ ...saved.report, computed_at: saved.updated_at });
  } catch (err) {
    console.error('getReview error:', err.message);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

// POST /api/accounting/review/:quarterId — ricalcola e salva (sovrascrive l'eventuale precedente).
async function postReview(req, res) {
  const { quarterId } = req.params;
  const token = (req.headers['authorization'] || '').split(' ')[1];

  if (!quarterId) return res.status(400).json({ error: 'quarterId mancante.' });
  if (!token) return res.status(401).json({ error: 'Token mancante.' });

  let report;
  try {
    report = await computeReview(quarterId, token);
  } catch (err) {
    if (err instanceof ReviewError) return res.status(err.status).json({ error: err.message });
    console.error('postReview unexpected error:', err.message);
    return res.status(500).json({ error: 'Errore imprevisto durante la revisione.' });
  }

  try {
    const [saved] = await ReviewReport.findOrCreate({
      where: { quarter_id: quarterId, tenant_id: req.user.tenant_id },
      defaults: { report, computed_by: req.user.id || null },
    });
    await saved.update({ report, computed_by: req.user.id || null });
    return res.json({ ...report, computed_at: saved.updated_at });
  } catch (err) {
    // Il salvataggio è un di più rispetto al calcolo: se fallisce, il report resta comunque
    // valido e viene restituito — semplicemente non sarà disponibile al prossimo GET.
    console.error('postReview save error:', err.message);
    return res.json(report);
  }
}

module.exports = { getReview, postReview };
