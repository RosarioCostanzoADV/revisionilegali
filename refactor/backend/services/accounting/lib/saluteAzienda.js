'use strict';

/**
 * Valutazione della salute dell'azienda a partire dal bilancio trimestrale.
 *
 * Come tutto il resto della revisione: gli indicatori sono calcolati in codice, in modo
 * deterministico e riproducibile. L'esito di ciascuno ("solido / attenzione / critico")
 * è una funzione di soglie esplicite, non un giudizio del modello. All'AI resta il
 * commento discorsivo (vedi commentoRevisione).
 *
 * LIMITE DICHIARATO: è la fotografia di UN trimestre. Senza i trimestri precedenti non c'è
 * andamento (in miglioramento / peggioramento): ogni indicatore va letto come istantanea.
 * Gli indicatori che richiedono dati non presenti nel bilancio (es. conto economico assente
 * nei bilanci trimestrali che riportano il solo Stato Patrimoniale) non vengono calcolati
 * anziché essere stimati.
 *
 * INDICI DI SINTESI (ROS, ROI, ROE, oneri finanziari / ricavi): esposti a parte in `indici`
 * per essere mostrati in evidenza, e conteggiati anche nello stato degli indicatori a cui
 * appartengono (Redditività, Struttura finanziaria). ROI e ROE mettono a confronto un
 * flusso (reddito del periodo) con uno stock (capitale a fine periodo): su un periodo
 * inferiore all'anno vengono ANNUALIZZATI (× 12 / mesi), assumendo — come nei bilanci di
 * verifica del gestionale — che il conto economico sia progressivo da inizio esercizio.
 * ROS e oneri/ricavi sono rapporti fra flussi dello stesso periodo: non serve annualizzarli.
 */

const STATO = { SOLIDO: 'solido', ATTENZIONE: 'attenzione', CRITICO: 'critico', ND: 'non_determinabile' };

/** Assegna uno stato in base a soglie esplicite. `bande` = [{ max, stato }] in ordine crescente. */
function valuta(valore, bande) {
  if (valore == null || !Number.isFinite(valore)) return STATO.ND;
  for (const b of bande) {
    if (valore <= b.max) return b.stato;
  }
  return bande[bande.length - 1].stato;
}

const arrotonda = (n) => (n == null || !Number.isFinite(n) ? null : +n.toFixed(2));
const pct = (n) => (n == null || !Number.isFinite(n) ? null : +(n * 100).toFixed(1));

const PRIORITA = [STATO.CRITICO, STATO.ATTENZIONE, STATO.SOLIDO];
/** Il peggiore fra gli stati valutabili (ND se nessuno lo è). */
const peggiore = (stati) => PRIORITA.find((s) => stati.includes(s)) ?? STATO.ND;

// Soglie degli indici di sintesi, condivise fra il riquadro in evidenza e gli indicatori.
const BANDE_REDDITIVITA = [
  { max: 0, stato: STATO.CRITICO },       // in perdita
  { max: 0.05, stato: STATO.ATTENZIONE }, // rendimento risicato
  { max: Infinity, stato: STATO.SOLIDO },
];
// Oneri finanziari / ricavi: più è alto, peggio è (soglie in linea con la prassi bancaria).
const BANDE_ONERI = [
  { max: 0.02, stato: STATO.SOLIDO },
  { max: 0.04, stato: STATO.ATTENZIONE },
  { max: Infinity, stato: STATO.CRITICO },
];

/**
 * @param input {
 *   conto_economico: { totale_costi, totale_ricavi, risultato_esercizio },
 *   crediti_clienti, debiti_fornitori, disponibilita_liquide, debiti_banche,
 *   ricavi_vendite, reddito_operativo, oneri_finanziari,   // dal conto economico
 *   capitale_investito, patrimonio_netto,                  // dallo stato patrimoniale
 *   mesi_periodo                                           // mesi coperti dal CE (per annualizzare)
 * }
 * I valori commerciali/finanziari sono quelli GIÀ riscontrati dalla riconciliazione,
 * così la salute e i riscontri raccontano gli stessi numeri.
 */
function valutaSalute(input) {
  // periodo: 'trimestre' (default) per la revisione trimestrale, 'anno' per la
  // revisione annuale (4° trimestre) — cambia solo il testo, non le soglie né il calcolo.
  const periodo = input.periodo === 'anno' ? 'anno' : 'trimestre';
  const delPeriodo = periodo === 'anno' ? "dell'anno" : 'del trimestre';
  const inEsame = periodo === 'anno' ? "l'anno in esame" : 'il trimestre in esame';

  const ce = input.conto_economico ?? {};
  const ricavi = ce.totale_ricavi;
  const costi = ce.totale_costi;
  const utile = ce.risultato_esercizio;

  const crediti = input.crediti_clienti ?? null;
  const fornitori = input.debiti_fornitori ?? null;
  const liquidita = input.disponibilita_liquide ?? null;
  const banche = input.debiti_banche ?? null;

  const ricaviVendite = input.ricavi_vendite || null;      // 0 = non presenti: rapporto non calcolabile
  const redditoOperativo = input.reddito_operativo ?? null;
  const oneriFin = input.oneri_finanziari ?? null;
  const capitaleInvestito = input.capitale_investito ?? null;
  const pn = input.patrimonio_netto ?? null;
  const mesi = input.mesi_periodo > 0 && input.mesi_periodo <= 12 ? input.mesi_periodo : null;
  const fattoreAnno = mesi ? 12 / mesi : null;
  const annualizzato = mesi != null && mesi < 12;

  const cePresente = ricavi != null && costi != null;

  // ── Indici di sintesi ────────────────────────────────────────────────────
  const ros = cePresente && ricavi ? utile / ricavi : null;          // return on sales
  // ROI: reddito operativo (A − B) sul capitale investito netto
  const roi = cePresente && redditoOperativo != null && capitaleInvestito > 0 && fattoreAnno
    ? (redditoOperativo * fattoreAnno) / capitaleInvestito
    : null;
  // ROE: risultato netto sul patrimonio netto. Con PN ≤ 0 il rapporto non ha significato
  // (e il segno si inverte): lo stato è critico a prescindere dal valore.
  const pnNegativo = pn != null && pn <= 0;
  const roe = cePresente && utile != null && pn > 0 && fattoreAnno ? (utile * fattoreAnno) / pn : null;
  const incidenzaOneri = cePresente && oneriFin != null && ricaviVendite ? oneriFin / ricaviVendite : null;

  const statoRos = valuta(ros, BANDE_REDDITIVITA);
  const statoRoi = valuta(roi, BANDE_REDDITIVITA);
  const statoRoe = pnNegativo && cePresente ? STATO.CRITICO : valuta(roe, BANDE_REDDITIVITA);
  const statoOneri = valuta(incidenzaOneri, BANDE_ONERI);

  const suffissoAnno = annualizzato ? ', annualizzato' : '';
  const indici = [
    {
      sigla: 'ROS',
      nome: 'Redditività delle vendite',
      formula: 'Risultato / Ricavi',
      valore: pct(ros),
      formato: 'percento',
      stato: statoRos,
      soglie: 'Solido oltre il 5% · Attenzione fino al 5% · Critico se negativo.',
    },
    {
      sigla: 'ROI',
      nome: 'Redditività del capitale investito',
      formula: `Reddito operativo / Capitale investito${suffissoAnno}`,
      valore: pct(roi),
      formato: 'percento',
      stato: statoRoi,
      soglie: 'Solido oltre il 5% · Attenzione fino al 5% · Critico se negativo.',
    },
    {
      sigla: 'ROE',
      nome: 'Redditività del capitale proprio',
      formula: `Risultato / Patrimonio netto${suffissoAnno}`,
      valore: pct(roe),
      formato: 'percento',
      stato: statoRoe,
      soglie: pnNegativo
        ? 'Patrimonio netto nullo o negativo: indice non significativo, situazione critica.'
        : 'Solido oltre il 5% · Attenzione fino al 5% · Critico se negativo.',
    },
    {
      sigla: 'OF/R',
      nome: 'Sostenibilità degli oneri finanziari',
      formula: 'Oneri finanziari / Ricavi delle vendite',
      valore: pct(incidenzaOneri),
      formato: 'percento',
      stato: statoOneri,
      soglie: 'Solido fino al 2% · Attenzione fra 2% e 4% · Critico oltre il 4%.',
    },
  ];

  const indicatori = [];

  // ── 1. Redditività (ROS, ROI, ROE) ───────────────────────────────────────
  const incidenzaCosti = cePresente && ricavi ? costi / ricavi : null;
  indicatori.push({
    dimensione: 'Redditività',
    domanda: `L'attività ${delPeriodo} genera margine e remunera il capitale?`,
    stato: peggiore([statoRos, statoRoi, statoRoe]),
    misure: [
      { etichetta: `Ricavi ${delPeriodo}`, valore: arrotonda(ricavi), formato: 'euro' },
      { etichetta: `Costi ${delPeriodo}`, valore: arrotonda(costi), formato: 'euro' },
      { etichetta: 'Risultato', valore: arrotonda(utile), formato: 'euro' },
      { etichetta: 'Margine sui ricavi (ROS)', valore: pct(ros), formato: 'percento', evidenza: true },
      { etichetta: 'Incidenza dei costi', valore: pct(incidenzaCosti), formato: 'percento' },
      { etichetta: 'Reddito operativo', valore: arrotonda(redditoOperativo), formato: 'euro' },
      { etichetta: 'Capitale investito netto', valore: arrotonda(capitaleInvestito), formato: 'euro' },
      { etichetta: `Rendimento del capitale investito (ROI${annualizzato ? ' annualizzato' : ''})`, valore: pct(roi), formato: 'percento' },
      { etichetta: 'Patrimonio netto', valore: arrotonda(pn), formato: 'euro' },
      { etichetta: `Rendimento del capitale proprio (ROE${annualizzato ? ' annualizzato' : ''})`, valore: pct(roe), formato: 'percento' },
    ],
    soglie: 'ROS, ROI e ROE: Solido oltre il 5% · Attenzione fino al 5% · Critico se negativi. Vale il peggiore dei tre.'
      + (annualizzato ? ` ROI e ROE annualizzati sui ${mesi} mesi del periodo.` : ''),
    nota: cePresente ? null : 'Conto economico non presente nel bilancio: redditività non valutabile.',
  });

  // ── 2. Equilibrio commerciale (crediti / debiti) ─────────────────────────
  // Quanto gli incassi attesi dai clienti coprono i pagamenti dovuti ai fornitori.
  const coperturaComm = crediti != null && fornitori ? crediti / fornitori : null;
  const saldoComm = crediti != null && fornitori != null ? crediti - fornitori : null;
  indicatori.push({
    dimensione: 'Equilibrio commerciale',
    domanda: 'I crediti verso i clienti coprono i debiti verso i fornitori?',
    stato: valuta(coperturaComm, [
      { max: 0.8, stato: STATO.CRITICO },
      { max: 1.0, stato: STATO.ATTENZIONE },
      { max: Infinity, stato: STATO.SOLIDO },
    ]),
    misure: [
      { etichetta: 'Crediti verso clienti', valore: arrotonda(crediti), formato: 'euro' },
      { etichetta: 'Debiti verso fornitori', valore: arrotonda(fornitori), formato: 'euro' },
      { etichetta: 'Saldo commerciale netto', valore: arrotonda(saldoComm), formato: 'euro' },
      { etichetta: 'Copertura dei fornitori', valore: arrotonda(coperturaComm), formato: 'volte', evidenza: true },
    ],
    soglie: 'Solido oltre 1,0× · Attenzione fra 0,8× e 1,0× · Critico sotto 0,8×.',
    nota: null,
  });

  // ── 3. Struttura finanziaria (indebitamento) ─────────────────────────────
  // Posizione finanziaria netta: debiti bancari al netto della liquidità disponibile.
  const pfn = banche != null && liquidita != null ? banche - liquidita : null;
  // Rapporto liquidità/debito bancario: >1 significa cassa sufficiente a estinguerlo.
  const coperturaBanche = banche ? (liquidita ?? 0) / banche : null;
  // Sostenibilità degli oneri finanziari: quanta parte dei ricavi assorbono.
  const statoCopertura = valuta(coperturaBanche, [
    { max: 0.5, stato: STATO.CRITICO },
    { max: 1.0, stato: STATO.ATTENZIONE },
    { max: Infinity, stato: STATO.SOLIDO },
  ]);
  indicatori.push({
    dimensione: 'Struttura finanziaria',
    domanda: 'Il debito bancario è sostenibile con la liquidità disponibile e con i ricavi?',
    stato: peggiore([statoCopertura, statoOneri]),
    misure: [
      { etichetta: 'Debiti verso banche', valore: arrotonda(banche), formato: 'euro' },
      { etichetta: 'Disponibilità liquide', valore: arrotonda(liquidita), formato: 'euro' },
      { etichetta: 'Posizione finanziaria netta', valore: arrotonda(pfn), formato: 'euro', evidenza: true },
      { etichetta: 'Copertura del debito con la liquidità', valore: arrotonda(coperturaBanche), formato: 'volte' },
      { etichetta: `Oneri finanziari ${delPeriodo}`, valore: arrotonda(oneriFin), formato: 'euro' },
      { etichetta: 'Oneri finanziari / ricavi delle vendite', valore: pct(incidenzaOneri), formato: 'percento' },
    ],
    soglie: 'Copertura: Solido oltre 1,0× · Attenzione fra 0,5× e 1,0× · Critico sotto 0,5×. '
      + 'Oneri finanziari / ricavi: Solido fino al 2% · Attenzione fino al 4% · Critico oltre. Vale il peggiore dei due.',
    nota: null,
  });

  // ── Giudizio di sintesi: il peggiore fra gli indicatori valutabili ───────
  const complessivo = peggiore(indicatori.map((i) => i.stato));

  return {
    complessivo,
    indici,
    indicatori,
    avvertenza: periodo === 'anno'
      ? "Indicatori riferiti all'intero esercizio: a differenza della revisione trimestrale, coprono i 12 mesi dell'anno. Vanno letti insieme ai rilievi sui singoli riscontri."
      : `Indicatori riferiti al solo ${inEsame}: essendo una fotografia puntuale, non esprimono un andamento. Vanno letti insieme ai rilievi sui singoli riscontri.`,
  };
}

module.exports = { valutaSalute, STATO };
