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
 * Gli indicatori che richiedono dati non presenti nel bilancio (es. patrimonio netto pulito)
 * non vengono calcolati anziché essere stimati.
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

/**
 * @param input {
 *   conto_economico: { totale_costi, totale_ricavi, risultato_esercizio },
 *   crediti_clienti, debiti_fornitori, disponibilita_liquide, debiti_banche
 * }
 * I valori commerciali/finanziari sono quelli GIÀ riscontrati dalla riconciliazione,
 * così la salute e i riscontri raccontano gli stessi numeri.
 */
function valutaSalute(input) {
  const ce = input.conto_economico ?? {};
  const ricavi = ce.totale_ricavi;
  const costi = ce.totale_costi;
  const utile = ce.risultato_esercizio;

  const crediti = input.crediti_clienti ?? null;
  const fornitori = input.debiti_fornitori ?? null;
  const liquidita = input.disponibilita_liquide ?? null;
  const banche = input.debiti_banche ?? null;

  const indicatori = [];

  // ── 1. Redditività (costi / ricavi) ──────────────────────────────────────
  const cePresente = ricavi != null && costi != null;
  const ros = cePresente && ricavi ? utile / ricavi : null;          // return on sales
  const incidenzaCosti = cePresente && ricavi ? costi / ricavi : null;
  indicatori.push({
    dimensione: 'Redditività',
    domanda: 'L\'attività del trimestre genera margine?',
    stato: valuta(ros, [
      { max: 0, stato: STATO.CRITICO },       // in perdita
      { max: 0.05, stato: STATO.ATTENZIONE }, // margine risicato
      { max: Infinity, stato: STATO.SOLIDO },
    ]),
    misure: [
      { etichetta: 'Ricavi del trimestre', valore: arrotonda(ricavi), formato: 'euro' },
      { etichetta: 'Costi del trimestre', valore: arrotonda(costi), formato: 'euro' },
      { etichetta: 'Risultato', valore: arrotonda(utile), formato: 'euro' },
      { etichetta: 'Margine sui ricavi (ROS)', valore: pct(ros), formato: 'percento', evidenza: true },
      { etichetta: 'Incidenza dei costi', valore: pct(incidenzaCosti), formato: 'percento' },
    ],
    soglie: 'Solido oltre il 5% di margine · Attenzione fino al 5% · Critico se in perdita.',
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
  indicatori.push({
    dimensione: 'Struttura finanziaria',
    domanda: 'Il debito bancario è sostenibile con la liquidità disponibile?',
    stato: valuta(coperturaBanche, [
      { max: 0.5, stato: STATO.CRITICO },
      { max: 1.0, stato: STATO.ATTENZIONE },
      { max: Infinity, stato: STATO.SOLIDO },
    ]),
    misure: [
      { etichetta: 'Debiti verso banche', valore: arrotonda(banche), formato: 'euro' },
      { etichetta: 'Disponibilità liquide', valore: arrotonda(liquidita), formato: 'euro' },
      { etichetta: 'Posizione finanziaria netta', valore: arrotonda(pfn), formato: 'euro', evidenza: true },
      { etichetta: 'Copertura del debito con la liquidità', valore: arrotonda(coperturaBanche), formato: 'volte' },
    ],
    soglie: 'Solido se la liquidità copre il debito (oltre 1,0×) · Attenzione fra 0,5× e 1,0× · Critico sotto 0,5×.',
    nota: null,
  });

  // ── Giudizio di sintesi: il peggiore fra gli indicatori valutabili ───────
  const valutabili = indicatori.map((i) => i.stato).filter((s) => s !== STATO.ND);
  const priorita = [STATO.CRITICO, STATO.ATTENZIONE, STATO.SOLIDO];
  const complessivo = priorita.find((s) => valutabili.includes(s)) ?? STATO.ND;

  return {
    complessivo,
    indicatori,
    avvertenza: 'Indicatori riferiti al solo trimestre in esame: essendo una fotografia puntuale, non esprimono un andamento. Vanno letti insieme ai rilievi sui singoli riscontri.',
  };
}

module.exports = { valutaSalute, STATO };
