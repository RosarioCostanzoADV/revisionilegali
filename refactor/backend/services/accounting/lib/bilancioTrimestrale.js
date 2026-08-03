'use strict';

/**
 * Utility NON-AI per la lettura e l'analisi di un bilancio trimestrale (PDF).
 *
 * Obiettivo (revisione del trimestre su un unico file di bilancio):
 *   1. Leggere le voci del bilancio dal PDF e normalizzarle in modo da poterle
 *      poi "matchare" con gli altri file a corredo (double check / riscontro).
 *   2. Verificare lo stato del Bilancio:
 *        - Stato Patrimoniale: anomalia se  PASSIVITA' > ATTIVITA'
 *        - Conto Economico:    anomalia se  COSTI      > RICAVI
 *
 * È deterministica: nessuna chiamata a modelli AI. Riusa da ./parsers.js solo
 * l'estrazione del testo (extractPagesText) e il parsing numerico (parseNumber);
 * l'estrazione delle voci è specifica per il layout del bilancio trimestrale
 * (report gestionale a due colonne, codici compatti mastro/conto/sottoconto).
 *
 * Aggiunge:
 *   - estrazione dei metadati dell'intestazione (azienda, P.IVA, data, ...)
 *   - estrazione delle voci (codice/descrizione/importo) con chiave di match
 *   - estrazione dei TOTALI di sezione direttamente dalle righe "TOTALE"
 *   - i due controlli di anomalia richiesti
 *
 * Modello dati esposto: vedi typedef in fondo al file.
 */

const { extractPagesText, parseNumber } = require('./parsers');

// ── Costanti sezioni normalizzate ─────────────────────────────────────────────

const SEZIONE = {
  SP_ATTIVO: 'SP_ATTIVO',
  SP_PASSIVO: 'SP_PASSIVO',
  CE_COSTI: 'CE_COSTI',
  CE_RICAVI: 'CE_RICAVI',
};

/**
 * Sotto-sezione indicativa (attivo/passivo, costi/ricavi) dedotta dal mastro
 * (prime 2 cifre del codice). NB: nel layout a due colonne alcuni mastri
 * compaiono su entrambi i lati (es. crediti/debiti riclassificati), quindi il
 * lato è un'indicazione: il prospetto SP/CE (dall'intestazione pagina) è certo,
 * la colonna no. Per il riscontro con altri file contano codice+descrizione.
 */
const MASTRO_SEZIONE = {
  SP: {
    attivo: new Set(['04', '10', '13', '19', '22', '25', '28', '31', '34', '35', '37']),
    passivo: new Set(['07', '16', '40', '43', '46', '49', '52']),
  },
  CE: {
    // Costi (colonna sinistra) e ricavi (colonna destra) del report.
    costi: new Set(['73', '75', '77', '79', '81', '83', '85', '87', '89', '91', '92']),
    ricavi: new Set(['60', '63', '66', '69', '71']),
  },
};

/**
 * Deduce la sotto-sezione normalizzata da prospetto (SP|CE) e codice conto.
 * Ritorna null quando il mastro è ambiguo o sconosciuto.
 */
function inferSezione(prospetto, codice) {
  const mastro = String(codice ?? '').replace(/\D/g, '').slice(0, 2);
  if (!mastro) return null;
  if (prospetto === 'SP') {
    if (MASTRO_SEZIONE.SP.attivo.has(mastro)) return SEZIONE.SP_ATTIVO;
    if (MASTRO_SEZIONE.SP.passivo.has(mastro)) return SEZIONE.SP_PASSIVO;
  } else if (prospetto === 'CE') {
    if (MASTRO_SEZIONE.CE.costi.has(mastro)) return SEZIONE.CE_COSTI;
    if (MASTRO_SEZIONE.CE.ricavi.has(mastro)) return SEZIONE.CE_RICAVI;
  }
  return null;
}

// ── Helpers testo ─────────────────────────────────────────────────────────────

/**
 * Normalizza una riga di testo PDF: rimuove a-capo/tab e collassa gli spazi.
 */
function normalizeLine(text) {
  return String(text ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Chiave di match riutilizzabile per confrontare la stessa voce fra file diversi.
 * Maiuscolo, senza accenti, senza punteggiatura, spazi collassati.
 */
function normalizzaDescrizione(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove i segni diacritici
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Costruisce la chiave di match per una voce. Preferisce il codice conto (stabile
 * fra prospetti dello stesso gestionale); in assenza usa la descrizione normalizzata.
 */
function buildMatchKey(entry) {
  const code = String(entry.account_code ?? entry.codice ?? '').trim();
  if (code) return `C:${code}`;
  const desc = normalizzaDescrizione(entry.account_name ?? entry.descrizione ?? '');
  return desc ? `D:${desc}` : '';
}

// ── Estrazione metadati intestazione ──────────────────────────────────────────

function firstMatch(text, re) {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Converte una data italiana gg/mm/aaaa in ISO aaaa-mm-gg.
 */
function toIsoDate(itDate) {
  if (!itDate) return null;
  const m = itDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Deriva il trimestre (1-4) dal mese della data di bilancio.
 */
function trimestreFromDate(itDate) {
  if (!itDate) return null;
  const m = itDate.match(/\d{2}\/(\d{2})\/\d{4}/);
  if (!m) return null;
  const mese = parseInt(m[1], 10);
  if (isNaN(mese) || mese < 1 || mese > 12) return null;
  return Math.ceil(mese / 3);
}

/**
 * Estrae i metadati dall'intestazione (presente su ogni pagina, usiamo la prima).
 */
function extractMeta(headerText) {
  const t = normalizeLine(headerText);

  const dataBilancio = firstMatch(t, /BILANCIO AL\s*(\d{2}\/\d{2}\/\d{4})/i);
  const annoRaw = firstMatch(t, /Anno:\s*(\d{4})/i);

  return {
    denominazione: firstMatch(t, /IMPORTO([A-ZÀ-Ù][^]*?)\s+Sede legale:/),
    sede: firstMatch(t, /Sede legale:\s*(.+?)\s+Partita IVA:/i),
    partita_iva: firstMatch(t, /Partita IVA:\s*(\d+)/i),
    codice_fiscale: firstMatch(t, /C\.\s*Fisc\.:\s*(\d+)/i),
    attivita: firstMatch(t, /Attivita':\s*(.+?)\s+Azienda:/i),
    azienda: firstMatch(t, /Azienda:\s*(\d+)/i),
    data_bilancio: dataBilancio,
    data_bilancio_iso: toIsoDate(dataBilancio),
    anno: annoRaw ? parseInt(annoRaw, 10) : null,
    trimestre: trimestreFromDate(dataBilancio),
    elaborato_da: firstMatch(t, /Elaborato da:\s*([A-Za-z]+)/i),
  };
}

// ── Estrazione totali di sezione ──────────────────────────────────────────────

/**
 * Nel layout a due colonne il testo scorre riga per riga: la colonna di SINISTRA
 * precede sempre quella di DESTRA. Quindi la prima "TOTALE" è la colonna sinistra
 * (ATTIVITA' per lo SP, COSTI per il CE) e la seconda è la destra (PASSIVITA' /
 * RICAVI). L'utile/perdita e il totale a pareggio compaiono dopo.
 *
 * @returns {{ sinistra:number|null, destra:number|null, risultato:number|null,
 *             tipoRisultato:('utile'|'perdita'|null), pareggio:number|null }}
 */
function extractTotali(sectionText) {
  const t = normalizeLine(sectionText);
  const out = {
    sinistra: null,
    destra: null,
    risultato: null,
    tipoRisultato: null,
    pareggio: null,
  };

  const tot = t.match(/\bTOTALE\s+([\d.]+,\d{2}-?)\s+TOTALE\s+([\d.]+,\d{2}-?)/i);
  if (tot) {
    out.sinistra = parseNumber(tot[1]);
    out.destra = parseNumber(tot[2]);
  }

  const ris = t.match(/(Utile|Perdita)\s+di\s+esercizio\s+([\d.]+,\d{2}-?)/i);
  if (ris) {
    const val = Math.abs(parseNumber(ris[2]));
    const isPerdita = /perdita/i.test(ris[1]);
    out.tipoRisultato = isPerdita ? 'perdita' : 'utile';
    out.risultato = isPerdita ? -val : val;
  }

  const par = t.match(/Totale a pareggio\s+([\d.]+,\d{2}-?)/i);
  if (par) out.pareggio = parseNumber(par[1]);

  return out;
}

// ── Costruzione voci normalizzate ─────────────────────────────────────────────

/**
 * Livello gerarchico approssimato dal codice conto (mastro/conto/sottoconto).
 * Codici a 2 cifre → livello 1; 4 cifre → 2; ecc. Codici puntati contano i punti.
 */
function livelloFromCode(code) {
  const c = String(code ?? '').trim();
  if (!c) return null;
  if (c.includes('.')) return c.split('.').length;
  // Codici gestionali compatti: 2 / 4 / 6-7 cifre ⇒ livello crescente.
  if (c.length <= 2) return 1;
  if (c.length <= 4) return 2;
  return 3;
}

// Codice conto compatto (2-7 cifre) preceduto da spazio/inizio e seguito da
// descrizione (lettera). L'ancoraggio allo spazio scarta i falsi codici generati
// dall'incollamento importo+codice della riga duplicata (es. "21.591,7507 F.DI").
const CODE_RE = /(?:^|\s)(\d{2,7})\s+(?=[A-Za-zÀ-ÿ])/g;
// Importo in formato italiano, eventuale segno meno finale (es. 347,65-).
const IT_NUM_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}-?/g;
// Confine oltre il quale iniziano i totali di sezione: da non includere nelle voci.
const TOTALI_BOUNDARY = /\b(?:TOTALE|Utile di esercizio|Perdita di esercizio|Totale a pareggio)\b/i;

/**
 * Rimuove l'intestazione ripetuta su ogni pagina (tutto fino a "Pag.: N").
 */
function stripHeader(pageText) {
  return normalizeLine(pageText).replace(/^.*?Pag\.:\s*\d+\s*/i, '');
}

/**
 * Estrae le voci grezze (codice/descrizione/importo) dal testo delle pagine.
 * Il prospetto (SP|CE) è determinato con certezza dall'intestazione di pagina.
 */
function extractVoci(pages) {
  const raw = [];

  for (const pageText of pages) {
    const clean = normalizeLine(pageText);
    const prospetto = /STATO PATRIMONIALE/i.test(clean)
      ? 'SP'
      : /CONTO ECONOMICO/i.test(clean)
        ? 'CE'
        : null;

    let body = stripHeader(pageText);
    // Taglia via la coda dei totali per non inquinare l'ultima voce.
    const boundary = body.search(TOTALI_BOUNDARY);
    if (boundary !== -1) body = body.slice(0, boundary);

    // Individua tutte le posizioni dei codici conto.
    const positions = [];
    let m;
    CODE_RE.lastIndex = 0;
    while ((m = CODE_RE.exec(body)) !== null) {
      positions.push({ code: m[1], descStart: m.index + m[0].length, start: m.index });
      CODE_RE.lastIndex = m.index + m[0].length; // ripartenza dal termine del match
    }

    for (let i = 0; i < positions.length; i++) {
      const { code, descStart } = positions[i];
      const segment = body.substring(descStart, positions[i + 1]?.start ?? body.length);

      const nums = [...segment.matchAll(IT_NUM_RE)];
      if (!nums.length) continue;

      // L'importo della voce è il PRIMO numero dopo la descrizione.
      const first = nums[0];
      const name = segment.slice(0, first.index).trim().replace(/\s+/g, ' ');
      if (name.length < 2) continue;

      raw.push({
        codice: code,
        descrizione: name,
        importo: parseNumber(first[0]),
        prospetto,
      });
    }
  }

  return raw;
}

/**
 * True se `codice` è una foglia (nessun altro codice lo ha come prefisso gerarchico).
 * Es. "0407" è genitore di "0407013"; "04" è genitore di "0407".
 */
function computeLeafFlags(codici) {
  const set = new Set(codici);
  const isLeaf = new Map();
  for (const c of set) {
    let hasChild = false;
    for (const other of set) {
      if (other !== c && other.startsWith(c) && other.length > c.length) {
        hasChild = true;
        break;
      }
    }
    isLeaf.set(c, !hasChild);
  }
  return isLeaf;
}

/**
 * Normalizza le voci grezze in voci pronte al match e all'analisi.
 */
function toVoci(rawVoci) {
  const leafFlags = computeLeafFlags(rawVoci.map((v) => v.codice));
  return rawVoci.map((v) => ({
    codice: v.codice ?? null,
    descrizione: v.descrizione,
    descrizione_norm: normalizzaDescrizione(v.descrizione),
    importo: v.importo,
    prospetto: v.prospetto ?? null,
    sezione: inferSezione(v.prospetto, v.codice),
    livello: livelloFromCode(v.codice),
    foglia: leafFlags.get(v.codice) ?? true,
    match_key: buildMatchKey(v),
    // Riscontro con altri file: popolato in fase di matching successiva.
    riscontro: null,
  }));
}

// ── Analisi anomalie ──────────────────────────────────────────────────────────

const EPS = 0.01;

/**
 * Applica i due controlli richiesti sul bilancio e restituisce l'elenco anomalie.
 *
 * @param {object} sp - { totale_attivita, totale_passivita }
 * @param {object} ce - { totale_costi, totale_ricavi }
 */
function rilevaAnomalie(sp, ce) {
  const anomalie = [];

  const attivo = sp.totale_attivita;
  const passivo = sp.totale_passivita;
  if (attivo != null && passivo != null && passivo - attivo > EPS) {
    anomalie.push({
      tipo: 'SP_PASSIVITA_MAGGIORI_ATTIVITA',
      prospetto: 'SP',
      messaggio:
        `Passività (${passivo.toFixed(2)}) superiori alle attività (${attivo.toFixed(2)}): ` +
        `sbilancio di ${(passivo - attivo).toFixed(2)}.`,
      delta: passivo - attivo,
    });
  }

  const costi = ce.totale_costi;
  const ricavi = ce.totale_ricavi;
  if (costi != null && ricavi != null && costi - ricavi > EPS) {
    anomalie.push({
      tipo: 'CE_COSTI_MAGGIORI_RICAVI',
      prospetto: 'CE',
      messaggio:
        `Costi (${costi.toFixed(2)}) superiori ai ricavi (${ricavi.toFixed(2)}): ` +
        `perdita d'esercizio di ${(costi - ricavi).toFixed(2)}.`,
      delta: costi - ricavi,
    });
  }

  return anomalie;
}

// ── API principale ────────────────────────────────────────────────────────────

/**
 * Analizza un bilancio trimestrale a partire dal testo delle pagine.
 * Separata da parseBilancioTrimestrale per essere testabile senza I/O.
 *
 * @param {string[]} pages - testo per pagina (già estratto dal PDF)
 * @returns {BilancioTrimestrale}
 */
function analizzaBilancio(pages) {
  const cleanPages = pages.map(normalizeLine).filter(Boolean);

  const meta = extractMeta(cleanPages[0] ?? '');

  const spPages = cleanPages.filter((t) => /STATO PATRIMONIALE/i.test(t));
  const cePages = cleanPages.filter((t) => /CONTO ECONOMICO/i.test(t));

  const spTot = extractTotali(spPages.join(' '));
  const ceTot = extractTotali(cePages.join(' '));

  const voci = toVoci(extractVoci(cleanPages));

  const stato_patrimoniale = {
    totale_attivita: spTot.sinistra,
    totale_passivita: spTot.destra,
    risultato_esercizio: spTot.risultato,
    tipo_risultato: spTot.tipoRisultato,
    totale_a_pareggio: spTot.pareggio,
    // Anomalia richiesta: passività > attività.
    anomalia:
      spTot.sinistra != null &&
      spTot.destra != null &&
      spTot.destra - spTot.sinistra > EPS,
    voci: voci.filter((v) => v.prospetto === 'SP'),
  };

  const conto_economico = {
    totale_costi: ceTot.sinistra,
    totale_ricavi: ceTot.destra,
    risultato_esercizio: ceTot.risultato,
    tipo_risultato: ceTot.tipoRisultato,
    totale_a_pareggio: ceTot.pareggio,
    // Anomalia richiesta: costi > ricavi.
    anomalia:
      ceTot.sinistra != null &&
      ceTot.destra != null &&
      ceTot.sinistra - ceTot.destra > EPS,
    voci: voci.filter((v) => v.prospetto === 'CE'),
  };

  const anomalie = rilevaAnomalie(stato_patrimoniale, conto_economico);

  // Controlli di quadratura (utili come sanity-check del parsing, non anomalie di merito).
  const quadratura = {
    sp_pareggio_ok:
      stato_patrimoniale.totale_a_pareggio != null &&
      stato_patrimoniale.totale_attivita != null &&
      Math.abs(stato_patrimoniale.totale_a_pareggio - Math.max(
        stato_patrimoniale.totale_attivita,
        stato_patrimoniale.totale_passivita ?? 0,
      )) < 0.5,
    // L'utile del CE deve coincidere con quello dello SP.
    utile_coerente:
      stato_patrimoniale.risultato_esercizio != null &&
      conto_economico.risultato_esercizio != null &&
      Math.abs(
        stato_patrimoniale.risultato_esercizio - conto_economico.risultato_esercizio,
      ) < 0.5,
  };

  return {
    meta,
    stato_patrimoniale,
    conto_economico,
    voci,
    anomalie,
    quadratura,
  };
}

/**
 * Entry point: legge un PDF di bilancio trimestrale e ne restituisce l'analisi.
 *
 * @param {Buffer|Uint8Array} buffer - contenuto del PDF
 * @returns {Promise<BilancioTrimestrale>}
 */
async function parseBilancioTrimestrale(buffer) {
  const pages = await extractPagesText(buffer);
  return analizzaBilancio(pages);
}

module.exports = {
  parseBilancioTrimestrale,
  analizzaBilancio,
  extractVoci,
  extractMeta,
  extractTotali,
  rilevaAnomalie,
  normalizzaDescrizione,
  buildMatchKey,
  inferSezione,
  toVoci,
  SEZIONE,
};

/**
 * @typedef {Object} BilancioTrimestrale
 * @property {Object} meta        Metadati intestazione (denominazione, P.IVA, data, trimestre...)
 * @property {Object} stato_patrimoniale  Totali/voci SP + flag anomalia (passività>attività)
 * @property {Object} conto_economico     Totali/voci CE + flag anomalia (costi>ricavi)
 * @property {Object[]} voci      Tutte le voci normalizzate con match_key per il riscontro
 * @property {Object[]} anomalie  Elenco anomalie rilevate
 * @property {Object} quadratura  Sanity-check di quadratura del parsing
 */
