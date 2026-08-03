#!/usr/bin/env node
'use strict';

/**
 * CLI di controllo revisione trimestre.
 *
 *   node analyze_bilancio.js <percorso-bilancio.pdf> [--json]
 *
 * Legge un unico file di bilancio trimestrale (PDF), ne estrae le voci e stampa:
 *   - metadati intestazione
 *   - totali di Stato Patrimoniale e Conto Economico
 *   - esito dei due controlli di anomalia (passività>attività, costi>ricavi)
 *   - numero di voci normalizzate pronte per il match con i file a corredo
 *
 * Con --json stampa l'intero oggetto BilancioTrimestrale (per pipeline/matching).
 */

const fs = require('fs');
const path = require('path');
const { parseBilancioTrimestrale } = require('../services/accounting/lib/bilancioTrimestrale');

function eur(n) {
  if (n == null) return 'n/d';
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const file = args.find((a) => !a.startsWith('--'));

  if (!file) {
    console.error('Uso: node analyze_bilancio.js <bilancio.pdf> [--json]');
    process.exit(2);
  }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`File non trovato: ${abs}`);
    process.exit(2);
  }

  const buffer = fs.readFileSync(abs);
  const b = await parseBilancioTrimestrale(buffer);

  if (asJson) {
    process.stdout.write(JSON.stringify(b, null, 2) + '\n');
    return;
  }

  const { meta, stato_patrimoniale: sp, conto_economico: ce } = b;

  console.log('══════════════════════════════════════════════════════════════');
  console.log(` BILANCIO TRIMESTRALE — ${meta.denominazione ?? 'n/d'}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log(` P.IVA: ${meta.partita_iva ?? 'n/d'}   C.F.: ${meta.codice_fiscale ?? 'n/d'}`);
  console.log(` Sede:  ${meta.sede ?? 'n/d'}`);
  console.log(` Bilancio al: ${meta.data_bilancio ?? 'n/d'} (anno ${meta.anno ?? '?'}, ` +
    `${meta.trimestre ? 'trimestre ' + meta.trimestre : 'trimestre n/d'})`);
  console.log('');

  console.log('── STATO PATRIMONIALE ────────────────────────────────────────');
  console.log(`   Totale ATTIVITÀ : ${eur(sp.totale_attivita)}`);
  console.log(`   Totale PASSIVITÀ: ${eur(sp.totale_passivita)}`);
  console.log(`   Risultato       : ${eur(sp.risultato_esercizio)} (${sp.tipo_risultato ?? 'n/d'})`);
  console.log(`   Esito controllo : ${sp.anomalia ? '⚠️  ANOMALIA — passività > attività' : '✅ regolare (attività ≥ passività)'}`);
  console.log('');

  console.log('── CONTO ECONOMICO ───────────────────────────────────────────');
  console.log(`   Totale COSTI    : ${eur(ce.totale_costi)}`);
  console.log(`   Totale RICAVI   : ${eur(ce.totale_ricavi)}`);
  console.log(`   Risultato       : ${eur(ce.risultato_esercizio)} (${ce.tipo_risultato ?? 'n/d'})`);
  console.log(`   Esito controllo : ${ce.anomalia ? '⚠️  ANOMALIA — costi > ricavi' : '✅ regolare (ricavi ≥ costi)'}`);
  console.log('');

  console.log('── VOCI / RISCONTRO ──────────────────────────────────────────');
  console.log(`   Voci totali estratte     : ${b.voci.length}`);
  console.log(`   di cui Stato Patrimoniale: ${sp.voci.length}`);
  console.log(`   di cui Conto Economico   : ${ce.voci.length}`);
  console.log(`   Quadratura SP a pareggio : ${b.quadratura.sp_pareggio_ok ? 'ok' : 'da verificare'}`);
  console.log(`   Utile SP≡CE coerente     : ${b.quadratura.utile_coerente ? 'ok' : 'da verificare'}`);
  console.log('');

  if (b.anomalie.length === 0) {
    console.log('ESITO: nessuna anomalia di sbilancio rilevata.');
  } else {
    console.log(`ESITO: ${b.anomalie.length} anomalia/e rilevata/e:`);
    for (const a of b.anomalie) console.log(`   • [${a.prospetto}] ${a.messaggio}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Errore:', err.message);
  process.exit(1);
});
