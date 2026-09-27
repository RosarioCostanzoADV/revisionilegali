'use strict';

/**
 * Revisione del trimestre — e, per il 4° trimestre, revisione ANNUALE.
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
 * Operazioni (trimestrale, Q1-Q3):
 *   1. Anomalie Stato Patrimoniale (passività > attività) — deterministico.
 *   2. Anomalie Conto Economico (costi > ricavi) — deterministico (se il CE è presente).
 *   3. Riconciliazione delle voci chiave con i documenti del trimestre — DETERMINISTICA.
 *   4. Commento professionale sui risultati — AI (Gemini).
 *
 * Il 4° trimestre è invece la revisione ANNUALE: il bilancio caricato deve essere quello
 * d'esercizio (12 mesi), non un bilancio trimestrale — verificato dall'AI, perché la sola
 * data di chiusura (31/12) non distingue i due casi. Il calcolo richiede inoltre che i
 * trimestri 1-3 dello stesso incarico abbiano la documentazione completa: la riconciliazione
 * annuale somma i registri IVA dei 4 trimestri, quindi senza quella documentazione l'importo
 * annuale sarebbe parziale e fuorviante — per questo il calcolo viene bloccato, non eseguito
 * con un risultato incompleto.
 *
 * Nota di progetto: i NUMERI non passano mai dall'AI. Sul campo il modello ha sbagliato
 * sistematicamente le due cose che qui contano: scegliere la riga giusta in un prospetto
 * (nella LIPE scambiava IVA esigibile e IVA detratta) e fare aritmetica. Legge, somma e
 * confronta il codice; all'AI restano il commento e la verifica del tipo di bilancio, cioè
 * ciò che sa fare meglio del codice: capire cosa dice un testo, non fare i conti.
 */

const { analizzaBilancio } = require('../lib/bilancioTrimestrale');
const { extractPagesText } = require('../lib/parsers');
const { listDocuments, downloadDocument } = require('../lib/documentClient');
const { getQuarter, listQuarters, getCategoryFlags } = require('../lib/assignmentClient');
const { verificaCompletezzaTrimestre } = require('../lib/assignmentCategories');
const { costruisciRiscontri, costruisciRiscontriAnnuali, sumByCode } = require('../lib/riconciliazione');
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

/**
 * Chiede all'AI se il bilancio caricato per il 4° trimestre è quello ANNUALE. A differenza
 * del commento, qui un fallimento NON può essere ignorato in silenzio: senza questa verifica
 * non c'è modo di accorgersi che è stato caricato per errore un bilancio trimestrale, quindi
 * l'errore va propagato e blocca il calcolo (vedi chiamata in computeReview).
 */
async function verificaBilancioAnnualeAI(analysis, pages) {
  const cePresente = analysis.conto_economico.totale_costi != null || analysis.conto_economico.totale_ricavi != null;
  const res = await fetch(`${AI_SERVICE_URL}/api/verifica-bilancio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify({
      meta: analysis.meta,
      contoEconomicoPresente: cePresente,
      testo: pages.join('\n'),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `ai-service ${res.status}`);
  return data; // { annuale, motivazione }
}

/** Errore con status HTTP esplicito, per distinguere i fallimenti attesi (400/502) da bug (500). */
class ReviewError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifica che i trimestri 1-3 dello stesso incarico abbiano la documentazione completa
 * (stessa regola di sblocco usata per la Revisione AI trimestrale: ogni categoria richiesta
 * ha almeno un documento, oppure è segnata N/A a livello di incarico). Ritorna anche i
 * documenti di quei trimestri, già scaricati: servono comunque per la riconciliazione annuale,
 * evita di rileggerli due volte.
 */
async function verificaTrimestriPrecedenti(assignmentId, token) {
  const [siblings, categoryFlags] = await Promise.all([
    listQuarters(assignmentId, token),
    getCategoryFlags(assignmentId, token),
  ]);

  const trimestriIncompleti = [];
  const docsPerQuarter = {};

  for (const n of [1, 2, 3]) {
    const q = siblings.find((s) => s.quarter === n);
    if (!q) {
      trimestriIncompleti.push({ trimestre: n, dettaglio: 'trimestre non ancora creato/iniziato.' });
      continue;
    }
    let docs;
    try {
      docs = await listDocuments(q.id, token);
    } catch (err) {
      trimestriIncompleti.push({ trimestre: n, dettaglio: 'impossibile leggere i documenti caricati.' });
      continue;
    }
    docsPerQuarter[n] = docs;
    const { completo, categorieMancanti } = verificaCompletezzaTrimestre(docs, categoryFlags);
    if (!completo) {
      trimestriIncompleti.push({
        trimestre: n,
        dettaglio: `mancano: ${categorieMancanti.map((c) => c.label).join(', ')}.`,
      });
    }
  }

  return { trimestriIncompleti, docsPerQuarter };
}

/** Il calcolo vero e proprio: legge i documenti, riconcilia, interroga l'AI. Nessuna persistenza qui. */
async function computeReview(quarterId, token) {
  // 0. Numero del trimestre e incarico di appartenenza: il 4° trimestre segue un percorso
  //    diverso (revisione annuale) dai primi tre.
  let quarterInfo;
  try {
    quarterInfo = await getQuarter(quarterId, token);
  } catch (err) {
    console.error('review getQuarter error:', err.message);
    throw new ReviewError(502, 'Impossibile leggere le informazioni del trimestre.');
  }
  const isAnnuale = quarterInfo.quarter === 4;

  // 1. Documenti del trimestre corrente
  let docs;
  try {
    docs = await listDocuments(quarterId, token);
  } catch (err) {
    console.error('review listDocuments error:', err.message);
    throw new ReviewError(502, 'Impossibile leggere i documenti del trimestre.');
  }

  const bilancioDoc = (docs || []).find((d) => d.category === 'bilancio');
  if (!bilancioDoc) {
    throw new ReviewError(400, isAnnuale
      ? 'Nessun bilancio caricato per il 4° trimestre. Carica prima il bilancio annuale.'
      : 'Nessun bilancio caricato per questo trimestre. Carica prima il bilancio.');
  }

  // 1b. Solo per il 4° trimestre: i trimestri precedenti devono essere completi PRIMA di
  //     leggere e analizzare qualunque cosa — il calcolo annuale non parte se manca la base.
  let docsPerQuarter = null;
  if (isAnnuale) {
    const { trimestriIncompleti, docsPerQuarter: docsPrecedenti } =
      await verificaTrimestriPrecedenti(quarterInfo.assignment_id, token);

    if (trimestriIncompleti.length) {
      const righe = trimestriIncompleti.map((t) => `— ${t.trimestre}° trimestre: ${t.dettaglio}`).join('\n');
      throw new ReviewError(
        400,
        `Non è possibile calcolare la revisione del 4° trimestre: la documentazione dei trimestri precedenti non è completa.\n${righe}\n\nCompleta la documentazione mancante nei trimestri indicati e riprova.`
      );
    }
    docsPerQuarter = { ...docsPrecedenti, 4: docs };
  }

  // 2. Analisi del bilancio (deterministica). Estraiamo anche il testo delle pagine: per il
  //    4° trimestre serve alla verifica AI del tipo di bilancio, oltre che al parsing stesso.
  let pages;
  let analysis;
  try {
    const buffer = await downloadDocument(bilancioDoc.id, token);
    pages = await extractPagesText(buffer);
    analysis = analizzaBilancio(pages);
  } catch (err) {
    console.error('review parse bilancio error:', err.message);
    throw new ReviewError(500, 'Errore nell\'analisi del bilancio.');
  }

  // 2b. Solo per il 4° trimestre: il bilancio DEVE essere quello annuale, non quello del
  //     solo 4° trimestre. La data di chiusura da sola non lo distingue: serve l'AI.
  if (isAnnuale) {
    let esitoVerifica;
    try {
      esitoVerifica = await verificaBilancioAnnualeAI(analysis, pages);
    } catch (err) {
      console.error('review verificaBilancioAnnualeAI error:', err.message);
      throw new ReviewError(502, `Verifica del tipo di bilancio non riuscita (${err.message}). Riprova.`);
    }
    if (!esitoVerifica.annuale) {
      throw new ReviewError(
        400,
        `Il documento caricato come bilancio per il 4° trimestre non risulta essere il bilancio annuale d'esercizio.` +
        (esitoVerifica.motivazione ? ` ${esitoVerifica.motivazione}` : '') +
        ` Carica il bilancio annuale (l'intero esercizio, non il solo 4° trimestre) e riprova.`
      );
    }
  }

  const sp = analysis.stato_patrimoniale;
  const ce = analysis.conto_economico;
  const cePresente = ce.totale_costi != null || ce.totale_ricavi != null;

  // 3. Riconciliazione con i documenti a corredo (deterministica)
  let riscontri = [];
  try {
    riscontri = isAnnuale
      ? await costruisciRiscontriAnnuali(analysis, docsPerQuarter, (id) => downloadDocument(id, token))
      : await costruisciRiscontri(analysis, docs, (id) => downloadDocument(id, token), analysis.meta?.trimestre);
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
    periodo: isAnnuale ? 'anno' : 'trimestre',
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

  const documentiAnalizzati = isAnnuale
    ? Object.values(docsPerQuarter).reduce((s, d) => s + (d?.length ?? 0), 0)
    : (docs || []).length;

  return {
    periodo: isAnnuale ? 'annuale' : 'trimestrale',
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
    documenti_analizzati: documentiAnalizzati,
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
