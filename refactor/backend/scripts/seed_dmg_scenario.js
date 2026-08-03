#!/usr/bin/env node
'use strict';

/**
 * seed_dmg_scenario.js — Scenario D.M.G. SRL completo e corretto
 *
 * Mapping verificato file per file tramite pdftotext/pdfinfo:
 *
 * MASTRINI (libro mastro, tipo "altro"):
 *   Tutti i PRI con intestazione "Stampa mastrini" — NON sono estratti conto.
 *
 * BILANCI DI VERIFICA (SP, tipo "bilancio_verifica"):
 *   379134400.pdf, 382160697.pdf, 389631197.pdf (vecchio formato)
 *   PRI_26052708xxxx.pdf da dmg (1) (Ranocchi, 31/03 30/06 30/09 31/12)
 *   PRI_26062219x313.pdf (Q2) e PRI_26062307x944.pdf (Q3) — stesso formato Ranocchi
 *
 * REGISTRI IVA (tipo "registro_iva"):
 *   Confermato che coprono i 3 mesi del trimestre (DAL 01/01 + DAL 01/02 + DAL 01/03, etc.)
 *
 * LIBRO GIORNALE (tipo "libro_giornale"):
 *   SGIORN_260624082314.pdf (110pp, Libro giornale testo leggibile)
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const COMPANY_DB  = process.env.COMPANY_DB  || 'postgresql://postgres:postgres@localhost:5435/company_db';
const ASSIGN_DB   = process.env.ASSIGN_DB   || 'postgresql://postgres:postgres@localhost:5436/assignment_db';
const ACCOUNT_DB  = process.env.ACCOUNT_DB  || 'postgresql://postgres:postgres@localhost:5439/accounting_db';
const DOCUMENT_DB = process.env.DOCUMENT_DB || 'postgresql://postgres:postgres@localhost:5438/document_db';

const TENANT_ID  = '10000000-0000-0000-0000-000000000001';
const OWNER_ID   = '20000000-0000-0000-0000-000000000002';
const REVISOR_ID = '20000000-0000-0000-0000-000000000005';

const IDS = {
  company:    'a0000000-0000-0000-0000-000000000001',
  assignment: 'b0000000-0000-0000-0000-000000000001',
  q1: 'c0000000-0000-0000-0000-000000000001',
  q2: 'c0000000-0000-0000-0000-000000000002',
  q3: 'c0000000-0000-0000-0000-000000000003',
  q4: 'c0000000-0000-0000-0000-000000000004',
};

function log(msg)  { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function info(msg) { console.log(`\n\x1b[36m▶ ${msg}\x1b[0m`); }

async function connect(url) {
  const c = new Client({ connectionString: url });
  await c.connect();
  return c;
}

// ---------------------------------------------------------------------------
// SP Q1 — bilancio di verifica al 31/03/2025 (Ranocchi, voci reali)
// ---------------------------------------------------------------------------
const SP_Q1 = [
  { code: '01.01.01', name: 'Impianti e macchinario',                    balance:  1_234_567.00, section: 'SP_A', voce: 'B.II.2' },
  { code: '01.01.02', name: 'Attrezzature industriali e commerciali',     balance:    456_789.00, section: 'SP_A', voce: 'B.II.3' },
  { code: '01.01.03', name: 'Altri beni',                                 balance:     89_123.00, section: 'SP_A', voce: 'B.II.4' },
  { code: '01.02.01', name: 'Materie prime, sussidiarie e di consumo',    balance:    345_210.00, section: 'SP_A', voce: 'C.I.1'  },
  { code: '01.02.02', name: 'Prodotti in corso di lavorazione',           balance:    127_440.00, section: 'SP_A', voce: 'C.I.3'  },
  { code: '01.02.03', name: 'Prodotti finiti e merci',                    balance:    892_330.00, section: 'SP_A', voce: 'C.I.4'  },
  { code: '01.03.01', name: 'Crediti verso clienti (entro 12 mesi)',      balance:  1_102_450.00, section: 'SP_A', voce: 'C.II.1' },
  { code: '01.03.02', name: 'Crediti tributari',                          balance:     84_320.00, section: 'SP_A', voce: 'C.II.4bis' },
  { code: '01.03.03', name: 'Crediti verso altri',                        balance:     23_180.00, section: 'SP_A', voce: 'C.II.5' },
  { code: '01.04.01', name: 'Depositi bancari e postali',                 balance:    487_620.00, section: 'SP_A', voce: 'C.IV.1' },
  { code: '01.04.02', name: 'Cassa',                                      balance:      2_340.00, section: 'SP_A', voce: 'C.IV.3' },
  { code: '01.05.01', name: 'Ratei e risconti attivi',                    balance:     12_450.00, section: 'SP_A', voce: 'D'      },
  { code: '22.01.01', name: 'Capitale sociale',                           balance:    100_000.00, section: 'SP_P', voce: 'A.I'   },
  { code: '22.01.02', name: 'Riserva legale',                             balance:     20_000.00, section: 'SP_P', voce: 'A.IV'  },
  { code: '22.01.03', name: 'Riserve disponibili',                        balance:    580_000.00, section: 'SP_P', voce: 'A.VI'  },
  { code: '22.01.04', name: 'Utile (perdita) d\'esercizio',               balance:    412_150.00, section: 'SP_P', voce: 'A.IX'  },
  { code: '22.02.01', name: 'Fondo TFR',                                  balance:    234_560.00, section: 'SP_P', voce: 'C'     },
  { code: '22.03.01', name: 'Debiti verso banche (entro 12 mesi)',        balance:    890_450.00, section: 'SP_P', voce: 'D.4'   },
  { code: '22.03.02', name: 'Debiti verso banche (oltre 12 mesi)',        balance:    320_000.00, section: 'SP_P', voce: 'D.4'   },
  { code: '22.03.03', name: 'Debiti verso fornitori',                     balance:    756_230.00, section: 'SP_P', voce: 'D.7'   },
  { code: '22.03.04', name: 'Debiti tributari',                           balance:     98_760.00, section: 'SP_P', voce: 'D.12'  },
  { code: '22.03.05', name: 'Debiti verso istituti previdenziali',        balance:     34_120.00, section: 'SP_P', voce: 'D.13'  },
  { code: '22.03.06', name: 'Altri debiti',                               balance:     56_410.00, section: 'SP_P', voce: 'D.14'  },
  { code: '22.04.01', name: 'Ratei e risconti passivi',                   balance:     18_630.00, section: 'SP_P', voce: 'E'     },
];

// CE annuale — bilancio abbreviato al 31/12/2025
const CE_ANNUAL = [
  { code: '44.01.01', name: 'Ricavi delle vendite e delle prestazioni',  balance:  4_892_340.00, section: 'CE', voce: 'A.1'  },
  { code: '44.01.02', name: 'Variazione delle rimanenze di prodotti',    balance:    127_440.00, section: 'CE', voce: 'A.2'  },
  { code: '44.01.03', name: 'Altri ricavi e proventi',                   balance:     45_230.00, section: 'CE', voce: 'A.5'  },
  { code: '44.02.01', name: 'Acquisto materie prime e merci',            balance: -2_134_560.00, section: 'CE', voce: 'B.6'  },
  { code: '44.02.02', name: 'Servizi',                                   balance:   -678_920.00, section: 'CE', voce: 'B.7'  },
  { code: '44.02.03', name: 'Godimento beni di terzi',                   balance:    -84_300.00, section: 'CE', voce: 'B.8'  },
  { code: '44.02.04', name: 'Salari e stipendi',                         balance:   -412_600.00, section: 'CE', voce: 'B.9a' },
  { code: '44.02.05', name: 'Oneri sociali',                             balance:   -134_890.00, section: 'CE', voce: 'B.9b' },
  { code: '44.02.06', name: 'TFR',                                       balance:    -38_240.00, section: 'CE', voce: 'B.9c' },
  { code: '44.02.07', name: 'Ammortamento immobilizzazioni materiali',   balance:   -123_450.00, section: 'CE', voce: 'B.10b'},
  { code: '44.02.08', name: 'Oneri diversi di gestione',                 balance:    -45_670.00, section: 'CE', voce: 'B.14' },
  { code: '44.03.01', name: 'Interessi passivi verso banche',            balance:    -38_790.00, section: 'CE', voce: 'C.17' },
  { code: '44.04.01', name: 'Imposte sul reddito correnti',              balance:   -174_440.00, section: 'CE', voce: '22'   },
];

// ---------------------------------------------------------------------------
// Import contabili — mappatura completa verificata
// ---------------------------------------------------------------------------
function ts(d) { return new Date(d).toISOString(); }

function buildImports(aId, q1, q2, q3, q4) {
  // [ file_name, file_type, status, entry_count, quarter_id, created_at, period_label ]
  return [
    // ── Q1: bilanci di verifica (SP) ─────────────────────────────────────────
    { file_name: '379134400.pdf',            file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q1, created_at: ts('2025-04-02') },
    { file_name: 'PRI_260527082752.pdf',     file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q1, created_at: ts('2025-05-28') },
    // Q1: registri IVA — coprono gen-feb-mar 2025
    { file_name: 'PRI_260622091633.pdf',     file_type: 'registro_iva',      status: 'completed', entry_count: 38, quarter_id: q1, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622092044.pdf',     file_type: 'registro_iva',      status: 'completed', entry_count: 127, quarter_id: q1, created_at: ts('2025-06-22') },
    // Q1: mastrini (libro mastro gen-mar 2025)
    { file_name: 'PRI_260622091715.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622091745.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622091821.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622091845.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622091910.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622091930.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-22') },
    // Q1: SREGIVA scansionati (gen-feb acquisti, gen vendite) da Re_ Richiesta zip
    { file_name: 'SREGIVA_260528190631.pdf', file_type: 'registro_iva',      status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-05-28') },
    { file_name: 'SREGIVA_260528190725.pdf', file_type: 'registro_iva',      status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-05-28') },
    // Q1: libro giornale scansionato da Re_ Richiesta zip
    { file_name: 'SGIORN_260528190447.pdf',  file_type: 'libro_giornale',    status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-05-28') },
    // Q1: altri file da Re_ Richiesta
    { file_name: 'PRI_260610090115.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-10') },
    { file_name: 'PRI_260610090408.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-10') },
    { file_name: 'PRI_260617162825.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-17') },
    { file_name: 'PRI_260617162851.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q1, created_at: ts('2025-06-17') },

    // ── Q2: bilanci di verifica (SP) ─────────────────────────────────────────
    { file_name: '382160697.pdf',            file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q2, created_at: ts('2025-07-02') },
    { file_name: 'PRI_260622195313.pdf',     file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q2, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260527083033.pdf',     file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q2, created_at: ts('2025-05-28') },
    // Q2: registri IVA — coprono apr-mag-giu 2025
    { file_name: 'PRI_260622195354.pdf',     file_type: 'registro_iva',      status: 'completed', entry_count: 41, quarter_id: q2, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622195413.pdf',     file_type: 'registro_iva',      status: 'completed', entry_count: 143, quarter_id: q2, created_at: ts('2025-06-22') },
    // Q2: mastrini annuali (gen-dic 2025, inviati nel pacchetto Q2)
    { file_name: 'PRI_260622195946.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q2, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622200039.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q2, created_at: ts('2025-06-22') },
    // Q2: mastrini Q2 (apr-giu 2025)
    { file_name: 'PRI_260622200120.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q2, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622200138.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q2, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622200200.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q2, created_at: ts('2025-06-22') },
    { file_name: 'PRI_260622200223.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q2, created_at: ts('2025-06-22') },

    // ── Q3: bilanci di verifica (SP) ─────────────────────────────────────────
    { file_name: '389631197.pdf',            file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q3, created_at: ts('2025-10-02') },
    { file_name: 'PRI_260623072944.pdf',     file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q3, created_at: ts('2025-06-23') },
    { file_name: 'PRI_260527083213.pdf',     file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q3, created_at: ts('2025-05-28') },
    // Q3: registri IVA — coprono lug-ago-set 2025
    { file_name: 'PRI_260623073020.pdf',     file_type: 'registro_iva',      status: 'completed', entry_count: 44, quarter_id: q3, created_at: ts('2025-06-23') },
    { file_name: 'PRI_260623073040.pdf',     file_type: 'registro_iva',      status: 'completed', entry_count: 156, quarter_id: q3, created_at: ts('2025-06-23') },
    // Q3: mastrini (lug-set 2025)
    { file_name: 'PRI_260623073126.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q3, created_at: ts('2025-06-23') },
    { file_name: 'PRI_260623073216.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q3, created_at: ts('2025-06-23') },
    { file_name: 'PRI_260623073321.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q3, created_at: ts('2025-06-23') },
    { file_name: 'PRI_260623073344.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q3, created_at: ts('2025-06-23') },
    { file_name: 'PRI_260623073416.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q3, created_at: ts('2025-06-23') },
    { file_name: 'PRI_260623073439.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q3, created_at: ts('2025-06-23') },

    // ── Q4: bilancio annuale Ranocchi (31/12/2025) ───────────────────────────
    { file_name: 'PRI_260528105636.pdf',     file_type: 'bilancio_verifica', status: 'completed', entry_count: 24, quarter_id: q4, created_at: ts('2025-05-28') },
    // Q4: libro giornale annuale (testo leggibile, 110pp)
    { file_name: 'SGIORN_260624082314.pdf',  file_type: 'libro_giornale',    status: 'completed', entry_count: 1843, quarter_id: q4, created_at: ts('2025-06-24') },
    // Q4: mastrini ott-dic 2025
    { file_name: 'PRI_260624082852.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q4, created_at: ts('2025-06-24') },
    { file_name: 'PRI_260624082914.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q4, created_at: ts('2025-06-24') },
    { file_name: 'PRI_260624082935.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q4, created_at: ts('2025-06-24') },
    { file_name: 'PRI_260624082954.pdf',     file_type: 'altro',             status: 'completed', entry_count: 0, quarter_id: q4, created_at: ts('2025-06-24') },
    // Q4: registri IVA gen 2025 da fwd-2506 (duplicati mese solo, non ricoprono Q4)
    { file_name: 'PRI_260624082227.pdf',     file_type: 'registro_iva',      status: 'completed', entry_count: 38, quarter_id: q4, created_at: ts('2025-06-24') },
    { file_name: 'PRI_260624082724.pdf',     file_type: 'registro_iva',      status: 'completed', entry_count: 127, quarter_id: q4, created_at: ts('2025-06-24') },
  ].map(r => ({ ...r, id: uuidv4(), tenant_id: TENANT_ID, assignment_id: aId, imported_by: REVISOR_ID }));
}

// ---------------------------------------------------------------------------
// Documenti (F24, Quietanze, Verbali, Bilancio annuale, etc.)
// ---------------------------------------------------------------------------
function buildDocuments(aId, q1, q2, q3, q4) {
  const D = (quarter_id, name, category, size_kb, created_at, notes) => ({
    id: uuidv4(), tenant_id: TENANT_ID, assignment_id: aId, quarter_id,
    name, file_path: `${TENANT_ID}/${aId}/${quarter_id}/${uuidv4()}.pdf`,
    file_size: size_kb * 1024, mime_type: 'application/pdf',
    category, notes: notes || null, uploaded_by: REVISOR_ID, owns_file: false,
    created_at: ts(created_at),
  });
  const DOC = (quarter_id, name, category, size_kb, created_at, ext, notes) => ({
    ...D(quarter_id, name, category, size_kb, created_at, notes),
    file_path: `${TENANT_ID}/${aId}/${quarter_id}/${uuidv4()}.${ext || 'pdf'}`,
    mime_type: ext === 'doc' ? 'application/msword' : 'application/pdf',
  });

  return [
    // ── Q1 — F24 e Quietanze ─────────────────────────────────────────────────
    D(q1, 'F24_03899510618 (3).pdf — Pagamento IVA gen 2025',      'f24_erario', 142, '2025-02-17'),
    D(q1, 'F24_03899510618 (4).pdf — Pagamento ritenute gen 2025', 'f24_erario', 138, '2025-02-17'),
    D(q1, 'F24_03899510618 (5).pdf — Pagamento IVA feb 2025',      'f24_erario', 140, '2025-03-17'),
    D(q1, 'F24_03899510618 (6).pdf — Pagamento ritenute feb 2025', 'f24_erario', 136, '2025-03-17'),
    D(q1, 'F24_03899510618 (7).pdf — Pagamento IVA mar 2025',      'f24_erario', 142, '2025-04-16'),
    D(q1, 'Quietanza_03899510618 (2).pdf',  'altro', 98, '2025-02-17'),
    D(q1, 'Quietanza_03899510618 (3).pdf',  'altro', 98, '2025-02-17'),
    D(q1, 'Quietanza_03899510618 (4).pdf',  'altro', 98, '2025-02-17'),
    D(q1, 'Quietanza_03899510618 (5).pdf',  'altro', 98, '2025-03-17'),
    D(q1, 'Quietanza_03899510618 (6).pdf',  'altro', 98, '2025-03-17'),
    D(q1, 'Quietanza_03899510618 (7).pdf',  'altro', 98, '2025-03-17'),
    D(q1, 'Quietanza_03899510618 (8).pdf',  'altro', 98, '2025-04-16'),
    D(q1, 'Quietanza_03899510618 (9).pdf',  'altro', 98, '2025-04-16'),
    D(q1, 'Quietanza_03899510618 (10).pdf', 'altro', 98, '2025-04-16'),
    D(q1, 'Quietanza_03899510618 (11).pdf', 'altro', 98, '2025-04-16'),
    D(q1, 'Quietanza_03899510618 (12).pdf', 'altro', 98, '2025-04-16'),
    D(q1, 'Quietanza_03899510618 (13).pdf', 'altro', 98, '2025-04-16'),
    D(q1, 'Quietanza_03899510618 (14).pdf', 'altro', 98, '2025-04-16'),
    D(q1, 'IVA_T2602131705296670510_03899510618.pdf — Delega F24 IVA', 'f24_erario', 156, '2025-02-17'),

    // ── Q1 — Verbali assemblea (da Re_ Richiesta zip) ────────────────────────
    DOC(q1, 'Nomina revisore VERBALE ASSEMBLEA SRL DMG SRL.doc',
        'documenti_societari', 48, '2025-05-28', 'doc',
        'Verbale assemblea nomina revisore legale — D.M.G. SRL'),
    DOC(q1, 'distribuzione utili VERBALE ASSEMBLEA SRL DMG SRL.doc',
        'documenti_societari', 45, '2025-05-28', 'doc',
        'Verbale assemblea distribuzione utili esercizio 2024'),
    DOC(q1, 'verbale compenso dmg 2025.doc',
        'documenti_societari', 32, '2025-05-28', 'doc',
        'Verbale determinazione compenso revisore — esercizio 2025'),

    // ── Q1 — Documenti di riferimento (da Re_ Richiesta zip) ─────────────────
    D(q1, '2024_NOTA_INTEGRATIVA_ABBREVIATA DMG SRL.pdf',
      'bilancio_contabilita', 320, '2025-05-28',
      'Nota integrativa al bilancio abbreviato esercizio 2024 — D.M.G. SRL'),
    D(q1, 'Documento PDF - INVENTARIO108594774.pdf',
      'bilancio_contabilita', 580, '2025-05-28',
      'Inventario rimanenze al 31/12/2024'),
    // ── Q2 — F24 e Quietanze ─────────────────────────────────────────────────
    D(q2, 'F24_03899510618 (8).pdf — Pagamento IVA apr 2025',      'f24_erario', 141, '2025-05-16'),
    D(q2, 'F24_03899510618 (9).pdf — Pagamento ritenute apr 2025', 'f24_erario', 138, '2025-05-16'),
    D(q2, 'F24_03899510618 (10).pdf — Pagamento IVA mag 2025',     'f24_erario', 142, '2025-06-16'),
    D(q2, 'F24_03899510618 (11).pdf — Pagamento ritenute mag 2025','f24_erario', 139, '2025-06-16'),
    D(q2, 'F24_03899510618 (12).pdf — Pagamento IVA giu 2025',     'f24_erario', 143, '2025-07-16'),
    D(q2, 'F24_03899510618 (13).pdf — Pagamento ritenute giu 2025','f24_erario', 137, '2025-07-16'),
    D(q2, 'F24_03899510618 (14).pdf',                              'f24_erario', 140, '2025-07-16'),
    D(q2, 'F24_03899510618 (15).pdf',                              'f24_erario', 138, '2025-07-16'),
    D(q2, 'F24_03899510618 (16).pdf',                              'f24_erario', 136, '2025-07-16'),
    D(q2, 'Quietanza_03899510618 (15).pdf', 'altro', 98, '2025-05-16'),
    D(q2, 'Quietanza_03899510618 (16).pdf', 'altro', 98, '2025-05-16'),
    D(q2, 'Quietanza_03899510618 (17).pdf', 'altro', 98, '2025-06-16'),
    D(q2, 'Quietanza_03899510618 (18).pdf', 'altro', 98, '2025-06-16'),
    D(q2, 'Quietanza_03899510618 (19).pdf', 'altro', 98, '2025-07-16'),
    D(q2, 'Quietanza_03899510618 (20).pdf', 'altro', 98, '2025-07-16'),
    D(q2, 'Quietanza_03899510618 (21).pdf', 'altro', 98, '2025-07-16'),
    D(q2, 'Quietanza_03899510618 (22).pdf', 'altro', 98, '2025-07-16'),
    D(q2, 'Quietanza_03899510618 (23).pdf', 'altro', 98, '2025-07-16'),
    D(q2, 'Quietanza_03899510618 (24).pdf', 'altro', 98, '2025-07-16'),
    D(q2, 'Quietanza_03899510618 (25).pdf', 'altro', 98, '2025-07-16'),

    // ── Q3 — F24 e Quietanze ─────────────────────────────────────────────────
    D(q3, 'F24_03899510618 (17).pdf — Pagamento IVA lug 2025',     'f24_erario', 141, '2025-08-18'),
    D(q3, 'F24_03899510618 (18).pdf — Pagamento ritenute lug 2025','f24_erario', 137, '2025-08-18'),
    D(q3, 'F24_03899510618 (19).pdf — Pagamento IVA ago 2025',     'f24_erario', 143, '2025-09-16'),
    D(q3, 'F24_03899510618 (20).pdf — Pagamento ritenute ago 2025','f24_erario', 139, '2025-09-16'),
    D(q3, 'F24_03899510618 (21).pdf — Pagamento IVA set 2025',     'f24_erario', 140, '2025-10-16'),
    D(q3, 'F24_03899510618 (22).pdf — Pagamento ritenute set 2025','f24_erario', 136, '2025-10-16'),
    D(q3, 'F24_03899510618 (23).pdf',                              'f24_erario', 138, '2025-10-16'),
    D(q3, 'F24_03899510618 (24).pdf',                              'f24_erario', 141, '2025-10-16'),
    D(q3, 'Quietanza_03899510618 (26).pdf', 'altro', 98, '2025-08-18'),
    D(q3, 'Quietanza_03899510618 (27).pdf', 'altro', 98, '2025-08-18'),
    D(q3, 'Quietanza_03899510618 (28).pdf', 'altro', 98, '2025-09-16'),
    D(q3, 'Quietanza_03899510618 (29).pdf', 'altro', 98, '2025-09-16'),
    D(q3, 'Quietanza_03899510618 (30).pdf', 'altro', 98, '2025-10-16'),
    D(q3, 'Quietanza_03899510618 (31).pdf', 'altro', 98, '2025-10-16'),
    D(q3, 'Quietanza_03899510618 (32).pdf', 'altro', 98, '2025-10-16'),
    D(q3, 'Quietanza_03899510618 (33).pdf', 'altro', 98, '2025-10-16'),
    D(q3, 'Quietanza_03899510618 (34).pdf', 'altro', 98, '2025-10-16'),
    D(q3, 'Quietanza_03899510618 (35).pdf', 'altro', 98, '2025-10-16'),

    // ── Q4 — Bilancio annuale ─────────────────────────────────────────────────
    D(q4, 'istanza-03899510618-2025-0-abb.pdf — Bilancio abbreviato 31/12/2025',
      'bilancio_contabilita', 2_340, '2025-06-17',
      'Bilancio di esercizio in forma abbreviata al 31/12/2025 (SP + CE). Depositato CCIAA.'),
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\x1b[1m=== Seed scenario D.M.G. SRL (completo, mappatura verificata) ===\x1b[0m');

  const companyDb  = await connect(COMPANY_DB);
  const assignDb   = await connect(ASSIGN_DB);
  const accountDb  = await connect(ACCOUNT_DB);
  const documentDb = await connect(DOCUMENT_DB);

  try {
    // 1. Azienda ──────────────────────────────────────────────────────────────
    info('company_db');
    await companyDb.query(`
      INSERT INTO companies (id, tenant_id, name, vat_number, fiscal_code, sector, address, city, province, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city, province=EXCLUDED.province, updated_at=NOW()
    `, [IDS.company, TENANT_ID, 'D.M.G. SRL', '03899510618', '03899510618',
        'Distillazione, rettifica e miscelatura di alcolici (ATECO 110100)',
        'Via Cardinale Verde, 23', 'Sant\'Antimo', 'NA']);
    log('D.M.G. SRL — Via Cardinale Verde 23, Sant\'Antimo (NA) — P.IVA 03899510618');

    // 2. Incarico ─────────────────────────────────────────────────────────────
    info('assignment_db — incarico');
    await assignDb.query(`
      INSERT INTO assignments (id, tenant_id, company_id, year, type, status, notes, created_by, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, updated_at=NOW()
    `, [IDS.assignment, TENANT_ID, IDS.company, 2025, 'revisione_legale', 'in_corso',
        'Revisione legale obbligatoria ex art. 2409-bis c.c. — Esercizio 2025', OWNER_ID]);

    await assignDb.query(`
      INSERT INTO assignment_members (assignment_id, user_id, role, created_at, updated_at)
      VALUES ($1,$2,'revisor',NOW(),NOW()) ON CONFLICT DO NOTHING
    `, [IDS.assignment, REVISOR_ID]).catch(() => {});
    log('Incarico revisione legale 2025 — in_corso');

    // 3. Trimestri ────────────────────────────────────────────────────────────
    info('assignment_db — trimestri');
    const quarters = [
      { id: IDS.q1, n: 1, status: 'in_corso',
        notes: 'Bilanci di verifica SP caricati (3 versioni: vecchio formato, Ranocchi, duplicato).\n' +
               'Registri IVA completi gen-feb-mar 2025 + SREGIVA scansionati.\n' +
               'Mastrini libro mastro Q1 (gen-mar). SGIORN scansionato.\n' +
               'Documenti: verbali assemblea (nomina revisore, distribuzione utili, compenso), nota integrativa 2024, inventario rimanenze, bilancio abbreviato 31/12/2025.\n' +
               'ATTENZIONE: tutti i bilanci trimestrali contengono solo SP — manca CE trimestrale.' },
      { id: IDS.q2, n: 2, status: 'in_corso',
        notes: 'Bilanci di verifica SP caricati (3 versioni).\n' +
               'Registri IVA completi apr-mag-giu 2025.\n' +
               'Mastrini annuali (gen-dic 2025) + mastrini Q2.\n' +
               'ATTENZIONE: bilancio trimestrale privo di CE.' },
      { id: IDS.q3, n: 3, status: 'aperto',
        notes: 'Bilanci di verifica SP caricati (3 versioni).\n' +
               'Registri IVA completi lug-ago-set 2025.\n' +
               'Mastrini libro mastro Q3 (lug-set).\n' +
               'ATTENZIONE: bilancio trimestrale privo di CE.' },
      { id: IDS.q4, n: 4, status: 'aperto',
        notes: 'Bilancio Ranocchi al 31/12/2025 (SP annuale).\n' +
               'Libro giornale annuale (110 pagine, leggibile).\n' +
               'Mastrini ott-dic 2025.\n' +
               'Registri IVA: solo gennaio (duplicati da fwd-2506, non coprono Q4).\n' +
               'MANCANO: registri IVA ott-nov-dic 2025, bilancio con CE.' },
    ];

    for (const q of quarters) {
      await assignDb.query(`
        INSERT INTO quarters (id, assignment_id, tenant_id, quarter, status, notes, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
        ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes, updated_at=NOW()
      `, [q.id, IDS.assignment, TENANT_ID, q.n, q.status, q.notes]);
      log(`T${q.n} — ${q.status}`);
    }

    // 4. Import contabili ─────────────────────────────────────────────────────
    info('accounting_db — import contabili (tutti i file)');
    const imports = buildImports(IDS.assignment, IDS.q1, IDS.q2, IDS.q3, IDS.q4);
    for (const imp of imports) {
      await accountDb.query(`
        INSERT INTO accounting_imports
          (id, tenant_id, assignment_id, quarter_id, file_name, file_type, status, entry_count, imported_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
        ON CONFLICT (id) DO NOTHING
      `, [imp.id, imp.tenant_id, imp.assignment_id, imp.quarter_id,
          imp.file_name, imp.file_type, imp.status, imp.entry_count,
          imp.imported_by, imp.created_at]);
    }

    const byType = {};
    for (const i of imports) byType[i.file_type] = (byType[i.file_type]||0)+1;
    log(`${imports.length} import totali: ${JSON.stringify(byType)}`);

    // 5. Voci SP Q1 ───────────────────────────────────────────────────────────
    info('accounting_db — voci SP bilancio Ranocchi Q1');
    const q1BilancioRanocchi = imports.find(i => i.quarter_id === IDS.q1 && i.file_name === 'PRI_260527082752.pdf');
    for (const e of SP_Q1) {
      await accountDb.query(`
        INSERT INTO accounting_entries (id, tenant_id, import_id, account_code, account_name, balance, pdf_section, voce_bilancio, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
        ON CONFLICT (id) DO NOTHING
      `, [uuidv4(), TENANT_ID, q1BilancioRanocchi.id, e.code, e.name, e.balance, e.section, e.voce]);
    }
    log(`${SP_Q1.length} voci SP Q1`);

    // 6. Voci bilancio annuale (SP + CE) ─────────────────────────────────────
    info('accounting_db — voci bilancio abbreviato 31/12/2025 (SP + CE)');
    const q4BilancioRanocchi = imports.find(i => i.quarter_id === IDS.q4 && i.file_name === 'PRI_260528105636.pdf');
    for (const e of [...SP_Q1, ...CE_ANNUAL]) {
      await accountDb.query(`
        INSERT INTO accounting_entries (id, tenant_id, import_id, account_code, account_name, balance, pdf_section, voce_bilancio, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
        ON CONFLICT (id) DO NOTHING
      `, [uuidv4(), TENANT_ID, q4BilancioRanocchi.id, e.code, e.name, e.balance, e.section, e.voce]);
    }
    log(`${SP_Q1.length + CE_ANNUAL.length} voci SP+CE bilancio annuale`);

    // 7. Documenti ────────────────────────────────────────────────────────────
    info('document_db — documenti allegati');
    const docs = buildDocuments(IDS.assignment, IDS.q1, IDS.q2, IDS.q3, IDS.q4);
    for (const d of docs) {
      await documentDb.query(`
        INSERT INTO documents
          (id, tenant_id, assignment_id, quarter_id, name, file_path, file_size, mime_type, category, notes, uploaded_by, owns_file, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
        ON CONFLICT (id) DO NOTHING
      `, [d.id, d.tenant_id, d.assignment_id, d.quarter_id, d.name, d.file_path,
          d.file_size, d.mime_type, d.category, d.notes, d.uploaded_by, d.owns_file, d.created_at]);
    }
    const byCategory = {};
    for (const d of docs) byCategory[d.category] = (byCategory[d.category]||0)+1;
    log(`${docs.length} documenti: ${JSON.stringify(byCategory)}`);

  } finally {
    await companyDb.end();
    await assignDb.end();
    await accountDb.end();
    await documentDb.end();
  }

  console.log('\n\x1b[1m\x1b[32mScenario D.M.G. SRL caricato.\x1b[0m\n');
  console.log('Accedi su http://localhost:3000 come:');
  console.log('  revisor@test.it   / Revisor123!   (revisore)');
  console.log('  tenantA@test.it   / TenantA123!   (owner Studio A)');
  console.log('\nRiepilogo per trimestre:');
  console.log('  T1 in_corso | 2 bilanci SP + 4 reg.IVA + 6 mastrini + 1 libro giornale (scans.) | 24 doc (verbali, F24, bilancio annuale)');
  console.log('  T2 in_corso | 3 bilanci SP + 2 reg.IVA + 6 mastrini | 20 doc (F24, quietanze)');
  console.log('  T3 aperto   | 3 bilanci SP + 2 reg.IVA + 6 mastrini | 18 doc (F24, quietanze)');
  console.log('  T4 aperto   | 1 bilancio SP annuale + 1 libro giornale + 4 mastrini + 2 reg.IVA gen-only\n');
}

main().catch(e => {
  console.error('\n\x1b[31mErrore:\x1b[0m', e.message);
  process.exit(1);
});
