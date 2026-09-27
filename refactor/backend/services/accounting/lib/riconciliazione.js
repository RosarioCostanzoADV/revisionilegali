'use strict';

/**
 * Riconciliazione deterministica del bilancio trimestrale con i documenti a corredo.
 *
 * Nessun valore prodotto qui passa da un modello linguistico: gli importi sono letti
 * dai PDF e sommati in codice. La lezione appresa sul campo è che l'AI sbaglia
 * sistematicamente le due cose che qui contano — scegliere la riga giusta in un
 * prospetto (nella LIPE ha scambiato IVA esigibile e IVA detratta) e fare aritmetica.
 * L'AI resta utile per il commento discorsivo, non per i numeri.
 *
 * Ogni riscontro espone anche le PROVE: quali righe, di quale documento, sommate come.
 */

const { extractPagesText } = require('./parsers');

// Soglie oltre le quali lo scostamento non è più trascurabile.
const TOLLERANZA_ASSOLUTA = 100;   // €
const TOLLERANZA_RELATIVA = 0.01;  // 1% del valore di bilancio

const IMPORTO = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}-?`;

/** Nei mastrini il segno meno è in CODA ("3.937,06-" = saldo avere). */
function parseImporto(t) {
  const negativo = String(t).endsWith('-');
  const v = Number(String(t).replace(/-$/, '').replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(v)) return null;
  return negativo ? -v : v;
}

/**
 * I moduli ministeriali (LIPE, F24) stampano i decimali in caselle separate:
 * "86.177 2 0" invece di "86.177,20". Vanno ricomposti o non sono leggibili come importi.
 */
function normalizzaImportiACaselle(text) {
  return text.replace(/(\d{1,3}(?:\.\d{3})+)\s(\d)\s(\d)(?!\d)/g, '$1,$2$3');
}

function testoPiatto(pages) {
  return normalizzaImportiACaselle(pages.join(' ').replace(/\s+/g, ' ').trim());
}

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

/** Somma gli importi delle voci con codice ESATTAMENTE uguale a `code`. */
function sumByCode(voci, code) {
  return +(voci ?? [])
    .filter((v) => String(v.codice ?? '') === code)
    .reduce((s, v) => s + (v.importo || 0), 0)
    .toFixed(2);
}

/**
 * Come è composta a bilancio una voce di controllo: tutti i sotto-conti che la
 * compongono. Serve a mostrare (e a spiegare) perché un aggregato può non riconciliare.
 */
function composizioneVoce(voci, prefisso) {
  return (voci ?? [])
    .filter((v) => new RegExp(`^${prefisso}\\d+$`).test(String(v.codice ?? '')))
    .map((v) => ({
      codice: String(v.codice),
      descrizione: v.descrizione ?? '',
      importo: +(v.importo || 0).toFixed(2),
      sezione: v.sezione ?? null,
    }));
}

/**
 * Il bilancio è stampato su due colonne (ATTIVITÀ | PASSIVITÀ) e lo stesso mastro può
 * comparire in entrambe: i clienti con saldo avere finiscono fra le passività sotto
 * "28 CREDITI", i fornitori con saldo dare fra le attività sotto "49 DEBITI". Nel testo
 * estratto le due colonne si mescolano, e `inferSezione` — che deduce la sezione dal
 * CODICE del conto — non può distinguerle: le somma insieme, ed è per questo che
 * "Crediti verso clienti" risultava 1.087.960,46 anziché 1.073.265,37.
 *
 * Qui i blocchi vengono separati usando i raggruppamenti del bilancio stesso: ogni
 * occorrenza dell'intestazione di mastro apre un blocco. Il blocco con il totale
 * maggiore è la colonna naturale del mastro; l'altro è la contropartita.
 */
function dividiInBlocchi(voci, mastro) {
  const blocchi = [];
  let corrente = null;
  for (const v of voci ?? []) {
    if (String(v.codice ?? '') === mastro) {
      corrente = { totale: +(v.importo || 0).toFixed(2), voci: [] };
      blocchi.push(corrente);
    } else if (corrente && String(v.codice ?? '').startsWith(mastro)) {
      corrente.voci.push(v);
    }
  }
  if (!blocchi.length) return { principale: { totale: 0, voci: [] }, contropartita: null };

  const ordinati = [...blocchi].sort((a, b) => Math.abs(b.totale) - Math.abs(a.totale));
  return {
    principale: ordinati[0],
    contropartita: ordinati[1] ?? null,
  };
}

// ── Registri IVA ─────────────────────────────────────────────────────────────
//
// La riga di totale è "TOTALI: <totale documento> <imponibile> <imposta>".
// Ogni mese ha subtotali di pagina e un totale di fine mese; SOLO quest'ultimo è
// ripetuto nella sezione RIEPILOGO. È questa ripetizione a identificarlo — sommare
// anche i subtotali di pagina gonfierebbe il risultato.

function parseRegistroIVA(pages) {
  const full = testoPiatto(pages);
  const re = new RegExp(`TOTALI:\\s*((?:${IMPORTO}\\s*){3})`, 'gi');

  const conteggio = new Map();
  for (const m of full.matchAll(re)) {
    const ns = m[1].trim().split(/\s+/).map(parseImporto);
    if (ns.some((n) => n == null)) continue;
    const k = ns.map((n) => n.toFixed(2)).join('|');
    conteggio.set(k, (conteggio.get(k) ?? 0) + 1);
  }

  const periodi = [...conteggio.entries()]
    .filter(([, c]) => c > 1) // ripetuto = totale di fine mese (registro + riepilogo)
    .map(([k]) => {
      const [totale, imponibile, imposta] = k.split('|').map(Number);
      return { totale, imponibile, imposta };
    });

  return {
    periodi,
    totaleImposta: +periodi.reduce((s, p) => s + p.imposta, 0).toFixed(2),
  };
}

// ── LIPE ─────────────────────────────────────────────────────────────────────
//
// Nel PDF della LIPE le etichette (VP2, VP4, VP5…) stanno in un blocco e i valori in
// un altro: non sono affiancati, e infatti Gemini scambiava IVA esigibile e IVA detratta.
// Li identifichiamo per invariante contabile, non per posizione:
//   VP2 (op. attive)  = importo maggiore del modulo
//   VP3 (op. passive) = secondo importo
//   VP4 (IVA esigibile) ≈ VP2 × aliquota   → l'importo più vicino
//   VP5 (IVA detratta)  ≈ VP3 × aliquota, fra i candidati che soddisfano VP4 − VP5 = VP6
// Il risultato viene poi confrontato col registro IVA: se le due fonti divergono, la
// lettura della LIPE è considerata inaffidabile e viene scartata anziché mostrata.

const ALIQUOTA_ATTESA = 0.22;

function parseModuloLIPE(pageText) {
  const t = normalizzaImportiACaselle(pageText.replace(/\s+/g, ' '));
  const nums = [...new Set(
    (t.match(new RegExp(String.raw`\d{1,3}(?:\.\d{3})*,\d{2}`, 'g')) ?? []).map(parseImporto)
  )].filter((n) => n != null && n > 0);
  if (nums.length < 4) return null;

  const ordinati = [...nums].sort((a, b) => b - a);
  const vp2 = ordinati[0];
  const vp3 = ordinati[1];

  const vicino = (target, candidati) =>
    candidati.reduce((best, n) =>
      best == null || Math.abs(n - target) < Math.abs(best - target) ? n : best, null);

  const vp4 = vicino(vp2 * ALIQUOTA_ATTESA, nums.filter((n) => n < vp3));
  if (vp4 == null) return null;

  const presenti = new Set(nums.map((n) => n.toFixed(2)));
  const candidatiVp5 = nums.filter(
    (n) => n < vp4 && presenti.has((+(vp4 - n).toFixed(2)).toFixed(2))
  );
  const vp5 = vicino(vp3 * ALIQUOTA_ATTESA, candidatiVp5);
  if (vp5 == null) return null;

  return {
    operazioni_attive: vp2,
    operazioni_passive: vp3,
    iva_esigibile: vp4,
    iva_detratta: vp5,
    iva_dovuta: +(vp4 - vp5).toFixed(2),
  };
}

function parseLIPE(pages) {
  const moduli = pages.map(parseModuloLIPE).filter(Boolean);
  if (!moduli.length) return null;
  return {
    moduli,
    totaleEsigibile: +moduli.reduce((s, m) => s + m.iva_esigibile, 0).toFixed(2),
    totaleDetratta: +moduli.reduce((s, m) => s + m.iva_detratta, 0).toFixed(2),
  };
}

// ── Mastrini ─────────────────────────────────────────────────────────────────

/** Saldo finale di un mastrino a conto singolo (banca): ultima riga "Totali :". */
function parseMastrinoConto(pages) {
  const full = testoPiatto(pages);
  const re = new RegExp(`Totali\\s*:\\s*((?:${IMPORTO}\\s*){1,3})`, 'gi');
  const righe = [...full.matchAll(re)];
  if (!righe.length) return null;

  const ultima = righe[righe.length - 1][1].trim().split(/\s+/).map(parseImporto);
  if (ultima.some((n) => n == null)) return null;

  return {
    dare: ultima.length === 3 ? ultima[0] : null,
    avere: ultima.length === 3 ? ultima[1] : null,
    saldo: ultima[ultima.length - 1],
  };
}

/**
 * Mastrino partitario (clienti/fornitori): un conto per ogni controparte, nessun totale
 * generale stampato. Il saldo della voce esiste solo come somma dei conti.
 *
 * ATTENZIONE al saldo del singolo conto. La riga "Totali :" riporta *Prog. DARE | Prog.
 * AVERE | Saldo*, ma le celle vuote spariscono dal testo estratto, e questo rende la riga
 * ambigua: un conto con fattura da 3.356,87 non incassata stampa "Totali : 3.356,87
 * 3.356,87" (dare + saldo, avere vuoto) — e un conto con fattura da 3.356,87 GIÀ INCASSATA
 * stampa esattamente la stessa cosa (dare + avere, saldo vuoto perché zero). Leggere
 * l'ultimo numero come saldo gonfia i crediti con conti in realtà chiusi.
 *
 * Il dato non ambiguo è il SALDO PROGRESSIVO in coda a ogni riga di movimento: l'ultima
 * riga del conto porta il saldo finale, e quando quel saldo è zero la cella resta vuota —
 * quindi una riga con un solo importo significa "conto chiuso".
 */
function parseMastrinoPartitario(pages) {
  const righe = pages.join('\n').split('\n').map((s) => s.trim()).filter(Boolean);
  const RE_IMPORTO = new RegExp(IMPORTO, 'g');

  const saldoDelConto = (movimenti) => {
    for (let i = movimenti.length - 1; i >= 0; i--) {
      const importi = movimenti[i].match(RE_IMPORTO);
      if (!importi) continue;
      // ≥2 importi: l'ultimo è il saldo progressivo. 1 solo importo: colonna saldo
      // vuota, cioè saldo zero (conto chiuso).
      return importi.length >= 2 ? parseImporto(importi[importi.length - 1]) : 0;
    }
    return null;
  };

  const conti = [];
  let corrente = null;
  let nome = null;
  for (const l of righe) {
    const intestazione = l.match(/^(?:Cli|For)\.\s+\d+\s+(.*?)(?:\s+Prog\.|$)/);
    if (intestazione) {
      corrente = [];
      nome = intestazione[1].trim();
      continue;
    }
    if (corrente === null) continue;
    if (/Totali\s*:/.test(l)) {
      const saldo = saldoDelConto(corrente);
      if (saldo != null) conti.push({ nome, saldo });
      corrente = null;
      continue;
    }
    corrente.push(l);
  }
  if (!conti.length) return null;

  const aperti = conti.filter((c) => c.saldo !== 0);
  const dare = +conti.filter((c) => c.saldo > 0).reduce((s, c) => s + c.saldo, 0).toFixed(2);
  const avere = +conti.filter((c) => c.saldo < 0).reduce((s, c) => s + c.saldo, 0).toFixed(2);

  return {
    conti: conti.length,
    conti_chiusi: conti.length - aperti.length,
    conti_aperti_dare: conti.filter((c) => c.saldo > 0).length,
    conti_aperti_avere: conti.filter((c) => c.saldo < 0).length,
    saldi_dare: dare,
    saldi_avere: +Math.abs(avere).toFixed(2),
    netto: +(dare + avere).toFixed(2),
    // I conti aperti più rilevanti: è ciò che un revisore guarda per primo.
    maggiori: [...aperti]
      .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo))
      .slice(0, 5)
      .map((c) => ({ nome: c.nome, saldo: c.saldo })),
  };
}

// ── Estratti conto bancari ───────────────────────────────────────────────────
//
// Ogni banca stampa l'estratto conto a modo suo: non esiste un layout comune come per i
// mastrini. L'unico elemento sempre presente è l'etichetta del saldo di chiusura ("Saldo
// finale", "Saldo contabile al 31/03/2025", "Saldo al…") seguita dall'importo. Si prende
// l'ULTIMA occorrenza: gli estratti riportano anche il saldo iniziale e, spesso, saldi
// intermedi per pagina o per mese, ma il saldo di chiusura del periodo è sempre in fondo.

const DATA = String.raw`\d{2}[\/.-]\d{2}[\/.-]\d{2,4}`;
const RE_SALDO_ESTRATTO = new RegExp(
  String.raw`saldo\s+(?:contabile\s+|finale\s+)*(?:finale\s+)?(?:al\s+(${DATA}))?` +
  String.raw`[^0-9\n]{0,30}?(\(?[-+]?\s*${IMPORTO.replace('-?', '')}\)?\s*[-+]?)(\s*(?:D|A|C|DARE|AVERE|a\s+debito|a\s+credito|debitore|creditore)\b)?`,
  'gi'
);

/** "31.03.25" / "31-03-2025" → "31/03/2025". */
function normalizzaData(d) {
  if (!d) return null;
  const [gg, mm, aa] = d.split(/[\/.-]/);
  return `${gg}/${mm}/${aa.length === 2 ? `20${aa}` : aa}`;
}

/**
 * Saldo di chiusura di un estratto conto: { saldo, data, riga } o null.
 * Il segno: un saldo "a debito" / "D" / "-" è uno scoperto (negativo per la società).
 * Le righe "saldo iniziale/precedente/medio" e il saldo "disponibile/liquido" (che include
 * fidi e valute) sono escluse: il riscontro si fa sul saldo CONTABILE di chiusura.
 */
function parseEstrattoConto(pages) {
  const full = testoPiatto(pages);
  let ultimo = null;
  for (const m of full.matchAll(RE_SALDO_ESTRATTO)) {
    // Solo l'etichetta (prima dell'importo): la frase successiva non conta.
    const etichetta = m[0].slice(0, m[0].indexOf(m[2]));
    if (/iniziale|precedente|medio|inizio|disponibile|liquido/i.test(etichetta)) continue;
    const grezzo = m[2].replace(/[()\s+]/g, '');
    const negativo = /-/.test(grezzo) || m[2].trim().startsWith('(')
      || /^\s*(D|DARE|a\s+debito|debitore)$/i.test(m[3] ?? '');
    const v = parseImporto(grezzo.replace(/-/g, ''));
    if (v == null) continue;
    ultimo = { saldo: negativo ? -v : v, data: normalizzaData(m[1]), riga: m[0].trim() };
  }
  return ultimo;
}

// ── Selezione documenti ──────────────────────────────────────────────────────

const trova = (docs, cat, re) =>
  (docs ?? []).find((d) => d.category === cat && (!re || re.test((d.name || '').toLowerCase())));

/** Codice conto letto dal nome del file: "34.01.017" o "3401017" → "3401017". */
function codiceDaNome(name) {
  const n = name || '';
  const puntato = n.match(/(\d{2})\.(\d{2})\.(\d{3})/);
  if (puntato) return `${puntato[1]}${puntato[2]}${puntato[3]}`;
  const secco = n.match(/(?<!\d)(3401\d{3})(?!\d)/);
  return secco ? secco[1] : null;
}

/** Mastrini banca indicizzati per codice conto, letto dal nome ("34.01.017" → "3401017"). */
function selectBankMastrini(docs) {
  const perCodice = new Map();
  for (const d of docs ?? []) {
    if (d.category !== 'mastrini') continue;
    const m = (d.name || '').match(/(\d{2})\.(\d{2})\.(\d{3})/);
    if (m) perCodice.set(`${m[1]}${m[2]}${m[3]}`, d);
  }
  return perCodice;
}

// Parole della descrizione del conto che non identificano una banca.
const PAROLE_GENERICHE = new Set([
  'BANCA', 'BANCO', 'BANK', 'C/C', 'CC', 'CONTO', 'CORRENTE', 'DEPOSITO', 'DEPOSITI',
  'BANCARI', 'BANCARIO', 'POSTALI', 'SPA', 'S.P.A.', 'DI', 'DEL', 'DELLA', 'E', 'N.', 'C/',
]);

function paroleBanca(descrizione) {
  return String(descrizione ?? '')
    .toUpperCase()
    .split(/[^A-Z0-9À-Ù]+/)
    .filter((p) => p.length >= 3 && !PAROLE_GENERICHE.has(p) && !/^\d+$/.test(p));
}

/**
 * Abbina ogni estratto conto a un conto banca del bilancio.
 *   1. codice conto nel nome del file ("34.01.017", "3401017") — abbinamento certo;
 *   2. altrimenti, nome della banca (dalla descrizione del conto a bilancio) presente nel
 *      nome del file o nell'intestazione dell'estratto — solo se indica UN solo conto:
 *      due conti presso la stessa banca non sono distinguibili così, e un abbinamento
 *      sbagliato è peggio di nessun abbinamento.
 * Restituisce { perCodice: Map<codice, {doc, pages}>, nonAbbinati: [{doc, motivo}] }.
 */
async function abbinaEstrattiConto({ docs, conti, download }) {
  const perCodice = new Map();
  const nonAbbinati = [];
  const estratti = (docs ?? []).filter((d) => d.category === 'estratti_conto_banca');

  for (const doc of estratti) {
    let pages = null;
    try {
      pages = await extractPagesText(await download(doc.id));
    } catch (err) {
      nonAbbinati.push({ doc, motivo: `file illeggibile (${err.message})` });
      continue;
    }

    let codice = codiceDaNome(doc.name);
    if (codice && !conti.some((c) => c.codice === codice)) {
      nonAbbinati.push({ doc, motivo: `il conto ${codice} indicato nel nome non è fra le banche del bilancio` });
      continue;
    }
    if (!codice) {
      // Nome file + prima pagina: l'intestazione della banca sta lì.
      const dove = `${doc.name} ${pages[0] ?? ''}`.toUpperCase();
      const candidati = conti.filter((c) => {
        const parole = paroleBanca(c.descrizione);
        return parole.length && parole.every((p) => dove.includes(p));
      });
      if (candidati.length === 1) codice = candidati[0].codice;
      else {
        nonAbbinati.push({
          doc,
          motivo: candidati.length > 1
            ? `corrisponde a più conti (${candidati.map((c) => c.codice).join(', ')}): indica il codice conto nel nome del file`
            : 'nessun conto banca riconosciuto: indica il codice conto (es. 34.01.017) nel nome del file',
        });
        continue;
      }
    }

    if (perCodice.has(codice)) {
      nonAbbinati.push({ doc, motivo: `conto ${codice} già abbinato a «${perCodice.get(codice).doc.name}»` });
      continue;
    }
    perCodice.set(codice, { doc, pages });
  }
  return { perCodice, nonAbbinati };
}

function selectDocumenti(docs) {
  return {
    registroAcquisto: trova(docs, 'registro_fatture_acquisto'),
    registroVendita: trova(docs, 'registro_fatture_vendita'),
    lipe: trova(docs, 'f24_registri_iva', /lipe|liquidazione/),
    mastriniClienti: trova(docs, 'mastrini', /client/),
    mastriniFornitori: trova(docs, 'mastrini', /fornitor/),
    banche: selectBankMastrini(docs),
  };
}

// ── Costruzione dei riscontri ────────────────────────────────────────────────
//
// Ogni riscontro porta con sé le PROVE: le righe effettivamente lette, da quale
// documento, e come sono state sommate. Chi legge il report deve poter rifare il
// conto a mano senza fidarsi di noi — e senza fidarsi di un modello.

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

/** Etichetta di periodo: i primi periodi sono i mesi, gli eventuali extra sono rettifiche. */
function etichettaPeriodo(p, i, mesiTrimestre) {
  if (p.imposta < 0) return 'Note di credito / rettifiche';
  return mesiTrimestre[i] ?? `Periodo ${i + 1}`;
}

async function riscontroIVA({ voci, codice, voceLabel, registroDoc, lipeDoc, campoLipe,
  descrizioneRegistro, descrizioneLipe, download, mesiTrimestre }) {
  const valoreBilancio = sumByCode(voci, codice);
  const base = {
    voce: voceLabel,
    codice,
    valore_bilancio: valoreBilancio,
    valore_riscontrato: null,
    esito: 'non_verificabile',
    scostamento: null,
    composizione: composizioneVoce(voci, codice.slice(0, 4)),
    prove: [],
    confronti: [],
    note: [],
  };

  if (!registroDoc) {
    base.note.push('Registro IVA non caricato: la voce non è riscontrabile.');
    return base;
  }

  let registro = null;
  try {
    registro = parseRegistroIVA(await extractPagesText(await download(registroDoc.id)));
  } catch (err) {
    base.note.push(`Registro IVA illeggibile (${err.message}).`);
    return base;
  }
  if (!registro?.periodi.length) {
    base.note.push('Nessuna riga "TOTALI" riconosciuta nel registro IVA.');
    return base;
  }

  base.prove.push({
    titolo: descrizioneRegistro,
    documento: registroDoc.name,
    colonne: ['Periodo', 'Totale documento', 'Imponibile', 'Imposta'],
    righe: registro.periodi.map((p, i) => [
      etichettaPeriodo(p, i, mesiTrimestre), p.totale, p.imponibile, p.imposta,
    ]),
    totale: { etichetta: 'Somma delle imposte', valore: registro.totaleImposta },
  });

  // Seconda fonte indipendente: la LIPE comunicata all'Agenzia delle Entrate.
  let lipe = null;
  if (lipeDoc) {
    try {
      lipe = parseLIPE(await extractPagesText(await download(lipeDoc.id)));
    } catch { /* la LIPE è un di più: se non si legge, il registro basta */ }
  }
  const totaleLipe = lipe ? lipe[campoLipe] : null;

  // Se le due fonti divergono, la lettura della LIPE non è affidabile: la si scarta
  // anziché mostrare un numero di cui non ci fidiamo.
  const lipeAttendibile = totaleLipe != null
    && Math.abs(totaleLipe - registro.totaleImposta) < Math.max(50, registro.totaleImposta * 0.02);

  if (lipeAttendibile) {
    base.prove.push({
      titolo: descrizioneLipe,
      documento: lipeDoc.name,
      colonne: ['Modulo', 'Operazioni attive', 'Operazioni passive', campoLipe === 'totaleEsigibile' ? 'IVA esigibile (VP4)' : 'IVA detratta (VP5)'],
      righe: lipe.moduli.map((m, i) => [
        mesiTrimestre[i] ?? `Modulo ${i + 1}`,
        m.operazioni_attive, m.operazioni_passive,
        campoLipe === 'totaleEsigibile' ? m.iva_esigibile : m.iva_detratta,
      ]),
      totale: { etichetta: 'Somma', valore: totaleLipe },
    });
    base.note.push(
      Math.abs(totaleLipe - registro.totaleImposta) < 0.01
        ? 'Le due fonti indipendenti (registro IVA e LIPE) coincidono al centesimo.'
        : `Registro e LIPE differiscono di ${Math.abs(totaleLipe - registro.totaleImposta).toFixed(2)} € (rettifiche di esigibilità).`
    );
  } else if (totaleLipe != null) {
    base.note.push('La LIPE non è stata usata: la lettura automatica non concorda col registro.');
  }

  base.valore_riscontrato = registro.totaleImposta;
  Object.assign(base, calcolaEsito(valoreBilancio, registro.totaleImposta));
  return base;
}

/**
 * Riscontro dei partitari clienti/fornitori.
 *
 * Il partitario è l'unico documento che copre queste voci, e copre esattamente UN
 * sotto-conto per lato (dare/avere). Riscontrare l'aggregato di bilancio sarebbe
 * strutturalmente impossibile: conterrebbe conti — come «DEBITI V.SO TERZI» — di cui
 * quel mastrino non sa nulla. Si riscontra quindi al livello in cui la documentazione
 * esiste davvero, e i conti scoperti diventano una voce a sé, con l'azione richiesta.
 */
async function riscontriPartitario({ voci, mastro, contoPrincipale, mastrinoDoc, tipo, download }) {
  const { principale, contropartita } = dividiInBlocchi(voci, mastro);
  const sub = (blocco, cod) => sumByCode(blocco?.voci ?? [], cod);

  const naturaleDare = tipo === 'clienti';           // i crediti stanno in DARE, i debiti in AVERE
  const etichettaContro = naturaleDare
    ? 'Clienti con saldo avere (fra le passività)'
    : 'Fornitori con saldo dare (fra le attività)';

  const prove = [];
  const noteComuni = [];
  let p = null;

  if (!mastrinoDoc) {
    noteComuni.push(`Mastrino ${tipo} non caricato.`);
  } else {
    try {
      p = parseMastrinoPartitario(await extractPagesText(await download(mastrinoDoc.id)));
    } catch (err) {
      noteComuni.push(`Mastrino ${tipo} illeggibile (${err.message}).`);
    }
    if (p) {
      prove.push({
        titolo: `Mastrino ${tipo} — composizione del partitario`,
        documento: mastrinoDoc.name,
        // I conteggi sono stringhe: sono numeri di conti, non importi, e non vanno
        // formattati come euro.
        colonne: ['Conti', 'N.', 'Saldo complessivo'],
        righe: [
          [`Aperti a DARE — ${naturaleDare ? 'crediti verso clienti' : 'anticipi a fornitori'}`, String(p.conti_aperti_dare), p.saldi_dare],
          [`Aperti ad AVERE — ${naturaleDare ? 'clienti a credito' : 'debiti verso fornitori'}`, String(p.conti_aperti_avere), p.saldi_avere],
          ['Chiusi — saldo zero, già regolati nel trimestre', String(p.conti_chiusi), 0],
          ['Totale conti nel partitario', String(p.conti), null],
        ],
        totale: null,
      });

      if (p.maggiori.length) {
        prove.push({
          titolo: `I ${p.maggiori.length} saldi aperti più rilevanti`,
          documento: mastrinoDoc.name,
          colonne: [tipo === 'clienti' ? 'Cliente' : 'Fornitore', 'Saldo'],
          righe: p.maggiori.map((c) => [c.nome, c.saldo]),
          totale: null,
        });
      }

      noteComuni.push(
        `Il partitario non stampa un totale generale: il saldo è la somma dei ${p.conti} conti, calcolata qui in codice.`
      );
      noteComuni.push(
        `${p.conti_chiusi} conti su ${p.conti} risultano chiusi a fine trimestre (saldo zero) e non concorrono al saldo: il loro giro dare/avere si compensa.`
      );
    }
  }

  const riscontri = [];

  // 1. Il conto principale, sul lato naturale del mastro.
  const bilPrincipale = sub(principale, contoPrincipale) || sumByCode(principale?.voci ?? [], mastro + '');
  const latoNaturale = p ? (naturaleDare ? p.saldi_dare : p.saldi_avere) : null;
  const rPrinc = {
    voce: naturaleDare ? 'Crediti verso clienti' : 'Debiti verso fornitori',
    codice: contoPrincipale,
    valore_bilancio: bilPrincipale,
    valore_riscontrato: latoNaturale,
    // I sotto-conti di ciò che si sta effettivamente riscontrando.
    composizione: (principale?.voci ?? [])
      .filter((v) => String(v.codice).startsWith(contoPrincipale)
        && String(v.codice).length > contoPrincipale.length)
      .map((v) => ({ codice: String(v.codice), descrizione: v.descrizione ?? '', importo: +(v.importo || 0).toFixed(2) })),
    prove: [...prove],
    confronti: [],
    note: [...noteComuni,
      `Confronto fra il conto ${contoPrincipale} a bilancio e i saldi ${naturaleDare ? 'DARE' : 'AVERE'} del partitario.`],
    ...calcolaEsito(bilPrincipale, latoNaturale),
  };
  riscontri.push(rPrinc);

  // 2. La contropartita: il lato opposto dello stesso mastro, che il bilancio espone
  //    nell'altra colonna. Il partitario lo copre ed è un riscontro a sé.
  if (contropartita) {
    const bilContro = +(contropartita.totale || 0).toFixed(2);
    const latoOpposto = p ? (naturaleDare ? p.saldi_avere : p.saldi_dare) : null;
    riscontri.push({
      voce: etichettaContro,
      codice: `${mastro}-C`,
      valore_bilancio: bilContro,
      valore_riscontrato: latoOpposto,
      composizione: (contropartita.voci ?? [])
        .map((v) => ({ codice: String(v.codice), descrizione: v.descrizione ?? '', importo: +(v.importo || 0).toFixed(2) })),
      prove: [...prove],
      confronti: [],
      note: [
        `Il bilancio espone questi conti nella colonna opposta: sono ${naturaleDare
          ? 'clienti che a fine trimestre risultano a credito verso la società'
          : 'fornitori che a fine trimestre risultano a debito verso la società'}.`,
        `Confronto con i saldi ${naturaleDare ? 'AVERE' : 'DARE'} del partitario.`,
      ],
      ...calcolaEsito(bilContro, latoOpposto),
    });
  }

  // 3. I sotto-conti compresi nella voce ma privi di partitario proprio: non sono
  //    riscontrabili, e va detto quale documento serve.
  // Fratelli del conto principale dentro lo stesso gruppo: stanno nella voce di bilancio
  // ma il partitario non li tocca. (Se il conto principale è già il gruppo — come per i
  // clienti — non ce ne sono: tutti i suoi figli sono coperti.)
  const gruppo = contoPrincipale.slice(0, 4);
  const scoperti = (principale?.voci ?? []).filter(
    (v) => String(v.codice).length > 4
      && String(v.codice).startsWith(gruppo)
      && !String(v.codice).startsWith(contoPrincipale)
      && Math.abs(v.importo || 0) > 100
  );
  for (const v of scoperti) {
    riscontri.push({
      voce: v.descrizione ? `${v.descrizione}` : `Conto ${v.codice}`,
      codice: String(v.codice),
      valore_bilancio: +(v.importo || 0).toFixed(2),
      valore_riscontrato: null,
      esito: 'non_verificabile',
      scostamento: null,
      composizione: [],
      prove: [],
      confronti: [],
      note: [
        `Il conto è compreso in «${naturaleDare ? 'Crediti verso clienti' : 'Debiti verso fornitori'}» ma non è coperto dal mastrino ${tipo}.`,
        `Per riscontrarlo serve il partitario del conto ${v.codice}: va richiesto alla società.`,
      ],
    });
  }

  return riscontri;
}

/**
 * Saldo dell'estratto conto utilizzabile per il riscontro, o null (con nota che spiega
 * perché). Aggiunge la prova della riga letta.
 */
function saldoEstratto({ base, estratto, dataChiusura }) {
  const { doc, pages } = estratto;
  const letto = parseEstrattoConto(pages);
  if (!letto) {
    base.note.push(`Estratto conto «${doc.name}»: saldo di chiusura non riconosciuto (nessuna riga "Saldo finale" / "Saldo al…" con importo).`);
    return null;
  }

  base.prove.push({
    titolo: 'Saldo di chiusura dell\'estratto conto bancario',
    documento: doc.name,
    colonne: ['Riga letta', 'Data', 'Saldo'],
    righe: [[letto.riga, letto.data ?? '—', letto.saldo]],
    totale: { etichetta: 'Saldo secondo la banca', valore: letto.saldo },
  });

  // Un estratto a una data diversa dalla chiusura del periodo non è confrontabile: il saldo
  // di un altro periodo darebbe un esito privo di significato, in un senso o nell'altro.
  if (letto.data && dataChiusura && letto.data !== dataChiusura) {
    base.note.push(`L'estratto conto riporta il saldo al ${letto.data}, non alla data di chiusura del bilancio (${dataChiusura}): non è stato usato nel riscontro.`);
    return null;
  }
  if (!letto.data) {
    base.note.push('L\'estratto conto non riporta la data accanto al saldo: verificare che sia quello di fine periodo.');
  }
  return letto.saldo;
}

async function riscontriBanche({ voci, docs, download, dataChiusura }) {
  const mastrini = selectBankMastrini(docs);
  const codici = [...new Set(
    (voci ?? []).map((v) => String(v.codice ?? '')).filter((c) => /^3401\d+$/.test(c))
  )];
  const conti = codici.map((codice) => ({
    codice,
    descrizione: (voci.find((v) => String(v.codice) === codice)?.descrizione) ?? '',
  }));
  const { perCodice: estratti, nonAbbinati } = await abbinaEstrattiConto({ docs, conti, download });
  const ciSonoEstratti = estratti.size > 0 || nonAbbinati.length > 0;

  const out = [];
  for (const codice of codici) {
    const valoreBilancio = sumByCode(voci, codice);
    if (Math.abs(valoreBilancio) <= 0.01) continue;
    const descr = (voci.find((v) => String(v.codice) === codice)?.descrizione) ?? codice;

    const base = {
      voce: `Banca — ${descr}`,
      codice,
      valore_bilancio: valoreBilancio,
      valore_riscontrato: null,
      esito: 'non_verificabile',
      scostamento: null,
      composizione: [],
      prove: [],
      confronti: [],
      note: [],
    };

    // 1. Mastrino del conto (contabilità della società).
    let saldoMastrino = null;
    const doc = mastrini.get(codice);
    if (!doc) {
      base.note.push(`Nessun mastrino caricato per il conto ${codice}.`);
    } else {
      let saldo = null;
      try {
        saldo = parseMastrinoConto(await extractPagesText(await download(doc.id)));
      } catch { /* gestito sotto */ }

      if (!saldo) {
        base.note.push('Saldo non leggibile: nessuna riga "Totali" riconosciuta nel mastrino.');
      } else {
        base.prove.push({
          titolo: 'Saldo finale del mastrino',
          documento: doc.name,
          colonne: ['Dare', 'Avere', 'Saldo'],
          righe: [[saldo.dare, saldo.avere, saldo.saldo]],
          totale: { etichetta: 'Saldo al termine del trimestre', valore: saldo.saldo },
        });
        saldoMastrino = saldo.saldo;
      }
    }

    // 2. Estratto conto (fonte ESTERNA: la banca). Quando c'è ed è utilizzabile è il
    //    riscontro principale — il mastrino è pur sempre la contabilità stessa, l'estratto
    //    no — e il mastrino resta come confronto di supporto.
    const estratto = estratti.get(codice);
    const saldoBanca = estratto ? saldoEstratto({ base, estratto, dataChiusura }) : null;
    if (!estratto) {
      base.note.push(ciSonoEstratti
        ? `Nessun estratto conto abbinato al conto ${codice}.`
        : 'Estratto conto bancario non caricato: il saldo è riscontrato solo con la contabilità (mastrino), non con la banca.');
    }

    if (saldoBanca != null) {
      base.valore_riscontrato = saldoBanca;
      Object.assign(base, calcolaEsito(valoreBilancio, saldoBanca));
      if (saldoMastrino != null) {
        base.confronti.push({
          etichetta: 'Bilancio ↔ mastrino del conto',
          etichetta_riscontrato: 'Mastrino',
          bilancio: valoreBilancio,
          riscontrato: saldoMastrino,
          ...calcolaEsito(valoreBilancio, saldoMastrino),
        });
      }
      if (base.esito === 'scostamento') {
        base.note.push('Il saldo della banca differisce dal bilancio: richiedere alla società il prospetto di riconciliazione bancaria (assegni emessi non incassati, bonifici in transito, addebiti non ancora registrati).');
      }
    } else if (saldoMastrino != null) {
      base.valore_riscontrato = saldoMastrino;
      Object.assign(base, calcolaEsito(valoreBilancio, saldoMastrino));
    }
    out.push(base);
  }

  // Estratti caricati ma non attribuibili a nessun conto: vanno segnalati, altrimenti il
  // revisore crederebbe di averli fatti riscontrare.
  if (nonAbbinati.length) {
    out.push({
      voce: 'Estratti conto bancari non abbinati',
      codice: '3401-EC',
      valore_bilancio: null,
      valore_riscontrato: null,
      esito: 'non_verificabile',
      scostamento: null,
      composizione: [],
      prove: [],
      confronti: [],
      note: nonAbbinati.map(({ doc, motivo }) => `«${doc.name}»: ${motivo}.`),
    });
  }
  return out;
}

/**
 * Costruisce tutti i riscontri del trimestre. `download(id)` deve restituire il Buffer
 * del documento. Nessuna chiamata AI: i numeri sono tutti calcolati qui.
 */
async function costruisciRiscontri(analysis, docs, download, quarter) {
  const voci = analysis.voci ?? [];
  const d = selectDocumenti(docs);

  const primoMese = ((Number(quarter) || 1) - 1) * 3;
  const mesiTrimestre = [MESI[primoMese], MESI[primoMese + 1], MESI[primoMese + 2]];

  const riscontri = [];

  riscontri.push(await riscontroIVA({
    voci, codice: '2811017', voceLabel: 'IVA a credito (Erario c/IVA acquisti)',
    registroDoc: d.registroAcquisto, lipeDoc: d.lipe, campoLipe: 'totaleDetratta',
    descrizioneRegistro: 'Registro fatture di acquisto — colonna «imposta» dei totali di fine mese',
    descrizioneLipe: 'LIPE — IVA detratta (rigo VP5)',
    download, mesiTrimestre,
  }));

  riscontri.push(await riscontroIVA({
    voci, codice: '4923013', voceLabel: 'IVA a debito (Erario c/IVA vendite)',
    registroDoc: d.registroVendita, lipeDoc: d.lipe, campoLipe: 'totaleEsigibile',
    descrizioneRegistro: 'Registro fatture di vendita — colonna «imposta» dei totali di fine mese',
    descrizioneLipe: 'LIPE — IVA esigibile (rigo VP4)',
    download, mesiTrimestre,
  }));

  // Il partitario clienti copre il conto 2801001; 2801554 («crediti di terzi pignorati»)
  // è un conto a sé, senza mastrino, e viene esposto come tale.
  riscontri.push(...await riscontriPartitario({
    voci, mastro: '28', contoPrincipale: '2801001',
    mastrinoDoc: d.mastriniClienti, tipo: 'clienti', download,
  }));

  riscontri.push(...await riscontriPartitario({
    voci, mastro: '49', contoPrincipale: '4913001',
    mastrinoDoc: d.mastriniFornitori, tipo: 'fornitori', download,
  }));

  riscontri.push(...await riscontriBanche({
    voci, docs, download, dataChiusura: analysis.meta?.data_bilancio ?? null,
  }));

  return riscontri;
}

/**
 * Riscontro IVA ANNUALE: somma il registro (e la LIPE) di più trimestri invece di uno
 * solo. Stesso principio della revisione trimestrale — leggere, sommare, confrontare —
 * solo con 4 fonti invece di una. Se manca il registro di un trimestre, quella parte
 * dell'anno resta non sommata e lo si dichiara in una nota: niente stime.
 */
async function riscontroIVAAnnuale({ voci, codice, voceLabel, registriPerTrimestre, lipePerTrimestre,
  campoLipe, descrizioneRegistro, descrizioneLipe, download }) {
  const valoreBilancio = sumByCode(voci, codice);
  const base = {
    voce: voceLabel,
    codice,
    valore_bilancio: valoreBilancio,
    valore_riscontrato: null,
    esito: 'non_verificabile',
    scostamento: null,
    composizione: composizioneVoce(voci, codice.slice(0, 4)),
    prove: [],
    confronti: [],
    note: [],
  };

  const perTrimestre = [];
  for (const trimestre of [1, 2, 3, 4]) {
    const doc = registriPerTrimestre[trimestre];
    if (!doc) {
      base.note.push(`Registro IVA del ${trimestre}° trimestre non caricato: il totale annuale è parziale.`);
      continue;
    }
    try {
      const registro = parseRegistroIVA(await extractPagesText(await download(doc.id)));
      if (!registro?.periodi.length) {
        base.note.push(`Nessuna riga "TOTALI" riconosciuta nel registro IVA del ${trimestre}° trimestre.`);
        continue;
      }
      perTrimestre.push({ trimestre, doc, registro });
    } catch (err) {
      base.note.push(`Registro IVA del ${trimestre}° trimestre illeggibile (${err.message}).`);
    }
  }

  if (!perTrimestre.length) return base;

  const totaleAnnuale = +perTrimestre.reduce((s, t) => s + t.registro.totaleImposta, 0).toFixed(2);

  base.prove.push({
    titolo: descrizioneRegistro,
    documento: perTrimestre.map((t) => `${t.doc.name} (${t.trimestre}° trim.)`).join('; '),
    colonne: ['Trimestre', 'Documento', 'Imposta'],
    righe: perTrimestre.map((t) => [`${t.trimestre}° trimestre`, t.doc.name, t.registro.totaleImposta]),
    totale: { etichetta: 'Somma delle imposte (anno)', valore: totaleAnnuale },
  });

  // Seconda fonte indipendente, sommata sugli stessi trimestri: se anche solo un
  // trimestre manca la LIPE annuale non è comparabile e viene scartata.
  const lipePerTrim = [];
  for (const { trimestre } of perTrimestre) {
    const doc = lipePerTrimestre[trimestre];
    if (!doc) continue;
    try {
      const lipe = parseLIPE(await extractPagesText(await download(doc.id)));
      const valore = lipe ? lipe[campoLipe] : null;
      if (valore != null) lipePerTrim.push({ trimestre, doc, valore });
    } catch { /* la LIPE è un di più: se non si legge, il registro basta */ }
  }

  if (lipePerTrim.length === perTrimestre.length) {
    const totaleLipe = +lipePerTrim.reduce((s, t) => s + t.valore, 0).toFixed(2);
    const lipeAttendibile = Math.abs(totaleLipe - totaleAnnuale) < Math.max(200, totaleAnnuale * 0.02);
    if (lipeAttendibile) {
      base.prove.push({
        titolo: descrizioneLipe,
        documento: lipePerTrim.map((t) => `${t.doc.name} (${t.trimestre}° trim.)`).join('; '),
        colonne: ['Trimestre', 'Documento', campoLipe === 'totaleEsigibile' ? 'IVA esigibile (VP4)' : 'IVA detratta (VP5)'],
        righe: lipePerTrim.map((t) => [`${t.trimestre}° trimestre`, t.doc.name, t.valore]),
        totale: { etichetta: 'Somma (anno)', valore: totaleLipe },
      });
      base.note.push(
        Math.abs(totaleLipe - totaleAnnuale) < 0.01
          ? 'Le due fonti indipendenti (registri IVA e LIPE, sommati sui trimestri disponibili) coincidono al centesimo.'
          : `Registri e LIPE (sommati sui trimestri disponibili) differiscono di ${Math.abs(totaleLipe - totaleAnnuale).toFixed(2)} € (rettifiche di esigibilità).`
      );
    } else {
      base.note.push('Le LIPE trimestrali non sono state usate: la somma non concorda con i registri.');
    }
  }

  base.valore_riscontrato = totaleAnnuale;
  Object.assign(base, calcolaEsito(valoreBilancio, totaleAnnuale));
  return base;
}

/**
 * Costruisce i riscontri della revisione ANNUALE (4° trimestre): stessa logica della
 * revisione trimestrale, ma le voci IVA sommano i registri/LIPE dei 4 trimestri, mentre
 * partitari e banche usano i documenti del 4° trimestre — che nella pratica osservata
 * sono già cumulativi da inizio anno (i mastrini caricati nei trimestri successivi al
 * primo si dichiarano "cumulativi 01/01-31/12"), quindi non richiedono somma.
 *
 * `docsPerQuarter` = { 1: [...], 2: [...], 3: [...], 4: [...] } — documenti di ciascun
 * trimestre dello stesso incarico, già recuperati dal chiamante.
 */
async function costruisciRiscontriAnnuali(analysis, docsPerQuarter, download) {
  const voci = analysis.voci ?? [];
  const docsQ4 = docsPerQuarter[4] ?? [];
  const d4 = selectDocumenti(docsQ4);

  const registriAcquisto = {};
  const registriVendita = {};
  const lipeDocs = {};
  for (const q of [1, 2, 3, 4]) {
    const dq = selectDocumenti(docsPerQuarter[q] ?? []);
    registriAcquisto[q] = dq.registroAcquisto;
    registriVendita[q] = dq.registroVendita;
    lipeDocs[q] = dq.lipe;
  }

  const riscontri = [];

  riscontri.push(await riscontroIVAAnnuale({
    voci, codice: '2811017', voceLabel: 'IVA a credito (Erario c/IVA acquisti)',
    registriPerTrimestre: registriAcquisto, lipePerTrimestre: lipeDocs, campoLipe: 'totaleDetratta',
    descrizioneRegistro: 'Registri fatture di acquisto — somma delle imposte dei 4 trimestri',
    descrizioneLipe: 'LIPE — IVA detratta (rigo VP5), somma dei trimestri disponibili',
    download,
  }));

  riscontri.push(await riscontroIVAAnnuale({
    voci, codice: '4923013', voceLabel: 'IVA a debito (Erario c/IVA vendite)',
    registriPerTrimestre: registriVendita, lipePerTrimestre: lipeDocs, campoLipe: 'totaleEsigibile',
    descrizioneRegistro: 'Registri fatture di vendita — somma delle imposte dei 4 trimestri',
    descrizioneLipe: 'LIPE — IVA esigibile (rigo VP4), somma dei trimestri disponibili',
    download,
  }));

  riscontri.push(...await riscontriPartitario({
    voci, mastro: '28', contoPrincipale: '2801001',
    mastrinoDoc: d4.mastriniClienti, tipo: 'clienti', download,
  }));

  riscontri.push(...await riscontriPartitario({
    voci, mastro: '49', contoPrincipale: '4913001',
    mastrinoDoc: d4.mastriniFornitori, tipo: 'fornitori', download,
  }));

  riscontri.push(...await riscontriBanche({
    voci, docs: docsQ4, download, dataChiusura: analysis.meta?.data_bilancio ?? null,
  }));

  return riscontri;
}

module.exports = {
  TOLLERANZA_ASSOLUTA,
  TOLLERANZA_RELATIVA,
  calcolaEsito,
  sumByCode,
  composizioneVoce,
  parseRegistroIVA,
  parseLIPE,
  parseMastrinoConto,
  parseMastrinoPartitario,
  parseEstrattoConto,
  selectDocumenti,
  selectBankMastrini,
  costruisciRiscontri,
  costruisciRiscontriAnnuali,
  extractPagesText,
};
