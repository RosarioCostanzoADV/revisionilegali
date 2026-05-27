'use strict';

/**
 * Classificazione deterministica delle voci contabili in audit area.
 * Portato da lib/audit/classification.ts.
 */

const AUDIT_AREAS = [
  {
    key: 'fondi_ammortamento',
    keywords: [
      'f.do amm', 'f.do ammort', 'fondo ammort', 'fondo amm.to',
      'fondi ammortamento', 'f.di ammortamento',
    ],
  },
  {
    key: 'immobilizzazioni',
    keywords: [
      'immobilizzaz', 'attrezzatur', 'macchinari', 'fabbricat', 'terreni',
      'avviamento', 'brevett', 'marchi', 'software', 'licenze', 'concessioni',
      'impianti', 'impianto', 'cespiti', 'costruzioni', 'mobili', 'arredi', 'veicoli',
      'automezzi', 'autoveicoli', 'leasing finanziario', 'beni in leasing',
      'costi di impianto', "costi d'impianto", 'costi d impianto',
      'beni immateriali', 'diritti brevett', 'diritti utenza',
    ],
  },
  {
    key: 'rimanenze',
    keywords: [
      'rimanenz', 'magazzino', 'merci', 'prodotti finiti', 'semilavorati',
      'materie prime', 'materiali', 'giacenze', 'scorte', 'lavori in corso',
      'commesse', 'prodotti in corso',
    ],
  },
  {
    key: 'crediti',
    keywords: [
      'crediti verso clienti', 'crediti clienti', 'fatture da emettere',
      'effetti attivi', 'ricevute bancarie', 'crediti commerciali',
      'crediti vs clienti', 'crediti v/clienti',
    ],
  },
  {
    key: 'altri_crediti',
    keywords: [
      'crediti tributari', 'credito iva', 'crediti verso erario', 'imposte anticipate',
      'crediti diversi', 'crediti verso altri', 'acconti', 'depositi cauzionali',
      'crediti verso soci', 'crediti vs soci', 'ratei attivi', 'risconti attivi',
    ],
  },
  {
    key: 'liquidita',
    keywords: [
      'cassa', 'banca', 'c/c', 'conto corrente', 'depositi bancari',
      'disponibilità liquide', 'assegni', 'valori bollati', 'denaro',
      'banche c/c', 'istituti di credito',
    ],
  },
  {
    key: 'patrimonio_netto',
    keywords: [
      'capitale sociale', 'riserva legale', 'riserva straordinaria', 'riserve',
      'utile', 'perdita', 'patrimonio netto', 'sovrapprezzo azioni',
      'versamenti soci', 'utili portati a nuovo', 'perdite portate a nuovo',
      'riserva da rivalutazione',
    ],
  },
  {
    key: 'debiti',
    keywords: [
      'debiti verso fornitori', 'debiti fornitori', 'fatture da ricevere',
      'debiti commerciali', 'debiti vs fornitori', 'debiti v/fornitori',
      'fornitori c/fatture da ricevere',
    ],
  },
  {
    key: 'debiti_finanziari',
    keywords: [
      'mutui', 'finanziamenti', 'obbligazioni', 'prestiti', 'debiti verso banche',
      'debiti vs banche', 'scoperti bancari', 'fidi bancari', 'leasing',
      'debiti finanziari', 'quota corrente mutui',
    ],
  },
  {
    key: 'debiti_tributari',
    keywords: [
      'debiti tributari', 'debiti verso erario', 'iva a debito', 'ires', 'irap',
      'debiti verso inps', 'inail', 'debiti previdenziali', 'ritenute da versare',
      'imposte', 'tasse', 'contributi da versare',
    ],
  },
  {
    key: 'tfr_fondi',
    keywords: [
      'tfr', 'trattamento fine rapporto', 'fondo trattamento',
      'fondi per rischi', 'fondo rischi', 'accantonamenti', 'fondo garanzie',
      'fondo svalutazione', 'fondo oneri futuri',
    ],
  },
  {
    key: 'ricavi',
    keywords: [
      'ricavi', 'vendita', 'ricavi delle vendite', 'ricavi da servizi',
      'prestazioni di servizi', 'proventi', 'corrispettivi',
      'fatturato', 'contributi in conto esercizio', 'altri ricavi', 'plusvalenze',
      'interessi attivi', 'proventi finanziari', 'dividendi', 'utili su cambi',
      'rivalutazione partecipazioni',
    ],
  },
  {
    key: 'costi_personale',
    keywords: [
      'personale', 'salari', 'stipendi', 'contributi previdenziali',
      'retribuzione', 'lavoratori dipendenti', 'collaboratori',
      'compensi amministratori', 'compensi sindaci', 'rimborsi spese dipendenti',
    ],
  },
  {
    key: 'acquisti_costi',
    keywords: [
      'acquisti', 'materie prime', 'merci c/acquisti', 'servizi',
      'godimento beni di terzi', 'noleggio', 'utenze', 'affitti', 'locazioni',
      'manutenzione', 'consulenze', 'pubblicità', 'spese generali',
      'costi per servizi', 'spese amministrative',
      'autofattur', 'reverse charge', 'inversione contabile', 'autoaddebito',
    ],
  },
  {
    key: 'oneri_finanziari',
    keywords: [
      'interessi passivi', 'oneri finanziari',
      'perdite su cambi', 'svalutazione partecipazioni',
    ],
  },
];

function classifyAccount(name) {
  const lower = name.toLowerCase();
  for (const area of AUDIT_AREAS) {
    if (area.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return area.key;
    }
  }
  return 'altri';
}

module.exports = { classifyAccount, AUDIT_AREAS };
