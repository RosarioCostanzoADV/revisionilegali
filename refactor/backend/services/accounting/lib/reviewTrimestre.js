'use strict';

/**
 * Logica di supporto alla "Revisione AI" del trimestre.
 *  - calcola le figure chiave del bilancio da riscontrare
 *  - seleziona i documenti a corredo rilevanti per il riscontro chiave
 *  - estrae dai corredo un excerpt di testo (i totali sono di norma in fondo)
 */

const { extractPagesText } = require('./parsers');

/** Somma gli importi delle voci con codice ESATTAMENTE uguale a `code`. */
function sumByCode(voci, code) {
  return voci
    .filter((v) => (v.codice ?? '') === code)
    .reduce((s, v) => s + (v.importo || 0), 0);
}

/**
 * Calcola le figure chiave del bilancio da sottoporre a riscontro.
 * Ritorna { controlli: [{ voce, valore_bilancio, dettaglio }] } — solo voci non nulle.
 */
function computeBilancioFigures(analysis) {
  const voci = analysis.voci ?? [];
  const candidati = [
    {
      code: '2801',
      voce: 'Crediti verso clienti',
      dettaglio: 'Confronta con mastrini clienti e/o registro fatture di vendita.',
    },
    {
      code: '4913',
      voce: 'Debiti verso fornitori',
      dettaglio: 'Confronta con mastrini fornitori e/o registro fatture di acquisto.',
    },
    {
      code: '4923013',
      voce: 'IVA a debito (Erario c/IVA vendite)',
      dettaglio: 'Confronta con la liquidazione periodica IVA (LIPE) / F24.',
    },
    {
      code: '2811017',
      voce: 'IVA a credito (Erario c/IVA acquisti)',
      dettaglio: 'Confronta con il registro fatture di acquisto / liquidazione IVA.',
    },
  ];

  const controlli = [];
  for (const c of candidati) {
    const val = sumByCode(voci, c.code);
    if (Math.abs(val) > 0.01) {
      controlli.push({
        voce: c.voce,
        codice: c.code,
        valore_bilancio: +val.toFixed(2),
        dettaglio: c.dettaglio,
      });
    }
  }
  return { controlli };
}

// ── Riconciliazione banche (deterministica, senza AI) ────────────────────────
//
// I conti 3401xxx del bilancio (depositi bancari) hanno un mastrino dedicato, e il
// nome del file ne porta il codice ("Mastrino BPER 34.01.017 Q1.pdf"). La mappatura
// è quindi univoca e il saldo è un numero stampato: non c'è nulla da interpretare,
// quindi il riscontro non passa dall'AI. Stesse soglie di tolleranza del riscontro AI.

const TOLLERANZA_ASSOLUTA = 100;   // €
const TOLLERANZA_RELATIVA = 0.01;  // 1%

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

/** Nei mastrini il segno meno è in CODA ("3.937,06-" = avere). */
function parseImportoContabile(t) {
  const negativo = t.endsWith('-');
  const v = Number(t.replace(/-$/, '').replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(v)) return null;
  return negativo ? -v : v;
}

/** Conti banca del bilancio (3401xxx). Esclude 3401, che è il totale di gruppo. */
function computeBankControls(analysis) {
  const voci = analysis.voci ?? [];
  const codici = [...new Set(
    voci.map((v) => String(v.codice ?? '')).filter((c) => /^3401\d+$/.test(c))
  )];
  return codici
    .map((codice) => {
      const v = voci.find((x) => String(x.codice ?? '') === codice);
      return {
        codice,
        voce: `Banca — ${v?.descrizione ?? codice}`,
        valore_bilancio: +sumByCode(voci, codice).toFixed(2),
      };
    })
    .filter((c) => Math.abs(c.valore_bilancio) > 0.01);
}

/** Indicizza i mastrini banca per codice conto, letto dal nome ("34.01.017" -> "3401017"). */
function selectBankMastrini(docs) {
  const perCodice = new Map();
  for (const d of docs ?? []) {
    if (d.category !== 'mastrini') continue;
    const m = (d.name || '').match(/(\d{2})\.(\d{2})\.(\d{3})/);
    if (!m) continue;
    perCodice.set(`${m[1]}${m[2]}${m[3]}`, d);
  }
  return perCodice;
}

/**
 * Saldo finale di un mastrino: ultima riga "Totali :", che riporta DARE | AVERE | SALDO.
 * Restituisce { dare, avere, saldo } o null se il documento non è un mastrino leggibile.
 */
async function extractSaldoMastrino(buffer) {
  let pages;
  try {
    pages = await extractPagesText(buffer);
  } catch {
    return null;
  }
  const full = pages.join(' ').replace(/\s+/g, ' ').trim();
  const re = /Totali\s*:\s*((?:\d{1,3}(?:\.\d{3})*,\d{2}-?\s*){1,3})/gi;
  const righe = [...full.matchAll(re)];
  if (!righe.length) return null;

  const ultima = righe[righe.length - 1][1].trim().split(/\s+/).map(parseImportoContabile);
  if (ultima.some((n) => n == null)) return null;

  return {
    dare: ultima.length === 3 ? ultima[0] : null,
    avere: ultima.length === 3 ? ultima[1] : null,
    saldo: ultima[ultima.length - 1],
  };
}

/**
 * Seleziona i documenti a corredo rilevanti per il riscontro chiave.
 * Evita di inviare all'AI documenti non utili (es. estratti conto banca minori).
 */
function selectCorredo(docs) {
  const picked = [];
  for (const d of docs) {
    const cat = d.category;
    const name = (d.name || '').toLowerCase();
    if (cat === 'registro_fatture_vendita' || cat === 'registro_fatture_acquisto') {
      picked.push(d);
    } else if (cat === 'mastrini' && /(client|fornitor)/.test(name)) {
      picked.push(d);
    } else if (cat === 'f24_registri_iva' && /(lipe|iva|liquidaz)/.test(name)) {
      picked.push(d);
    }
  }
  // Limite di sicurezza per contenere la dimensione del prompt.
  return picked.slice(0, 6);
}

/**
 * I moduli ministeriali (LIPE, F24) stampano gli importi in caselle: i decimali
 * escono dal PDF come cifre staccate — "86.177 2 0" invece di "86.177,20".
 * Senza questa normalizzazione quei valori non sono riconoscibili come importi,
 * né dal modello né dal controllo di esistenza lato ai-service.
 * Richiede il separatore delle migliaia per non trasformare sequenze di cifre
 * qualsiasi (codici, date) in falsi importi.
 */
function normalizzaImportiACaselle(text) {
  return text.replace(/(\d{1,3}(?:\.\d{3})+)\s(\d)\s(\d)(?!\d)/g, '$1,$2$3');
}

/**
 * Estrae un excerpt utile dal documento a corredo per il riscontro:
 *   1. le righe "TOTALE … <importo>" (dove risiede il dato da confrontare)
 *   2. la coda del documento (i totali di norma sono in fondo)
 * Niente marcatori tipo "[...]" che l'AI potrebbe leggere come dati omessi.
 */
async function extractCorredoExcerpt(buffer) {
  let pages;
  try {
    pages = await extractPagesText(buffer);
  } catch {
    return '';
  }
  const full = normalizzaImportiACaselle(
    pages.join(' ').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  );
  if (!full) return '';
  if (full.length <= 5500) return full;

  // 1. Righe "TOTALE/TOTALI ..." con TUTTI gli importi che le seguono.
  // Nei registri IVA la riga è "TOTALI: <totale documento> <imponibile> <imposta>":
  // catturarne solo il primo importo scartava proprio l'imposta, cioè l'unico dato
  // con cui si riscontra l'IVA. Le sezioni di RIEPILOGO ripetono la stessa riga:
  // le righe identiche vengono deduplicate per non moltiplicare i candidati.
  const IMPORTO = String.raw`-?\d{1,3}(?:\.\d{3})*,\d{2}`;
  const re = new RegExp(`(TOTAL[EI][^0-9\\-]{0,45}?)((?:${IMPORTO}\\s*){1,4})`, 'gi');
  const totali = [];
  const visti = new Set();
  let m;
  while ((m = re.exec(full)) !== null && totali.length < 60) {
    const etichetta = m[1].replace(/\s+/g, ' ').trim();
    const importi = m[2].trim().split(/\s+/).join(' | ');
    const riga = `${etichetta} ${importi}`;
    if (visti.has(riga)) continue;
    visti.add(riga);
    totali.push(riga);
  }
  const totaliBlock = totali.length
    ? 'TOTALI RILEVATI NEL DOCUMENTO (gli importi di ogni riga sono nell\'ordine in cui\n'
      + 'compaiono nel documento; nei registri IVA di norma: totale documento | imponibile | imposta):\n'
      + `${totali.join('\n')}\n\n`
    : '';

  // 2. Coda del documento
  const tail = full.slice(-3200);
  return `${totaliBlock}ESTRATTO FINALE DEL DOCUMENTO:\n${tail}`.slice(0, 6000);
}

module.exports = {
  computeBilancioFigures,
  selectCorredo,
  extractCorredoExcerpt,
  sumByCode,
  computeBankControls,
  selectBankMastrini,
  extractSaldoMastrino,
  calcolaEsito,
};
