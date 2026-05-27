#!/usr/bin/env node
// =============================================================================
// export_via_api.js — Alternativa a export_supabase.sh
// Usa le Supabase REST API (service_role key) invece di psql diretto.
// Non richiede la password del DB PostgreSQL.
//
// Uso:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
//   node export_via_api.js
//
// NOTA: gli hash delle password (auth.users.encrypted_password) non sono
// accessibili via REST API per motivi di sicurezza. Gli utenti migrati non
// avranno password → dovranno fare reset password al primo accesso.
// =============================================================================

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

// ---------------------------------------------------------------------------
// Configurazione
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Variabili d\'ambiente mancanti.');
  console.error('    Richieste: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

mkdirSync(DATA_DIR, { recursive: true });

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
// Helper: converti array di oggetti → CSV
// ---------------------------------------------------------------------------
function toCSV(rows, columns) {
  if (!rows || rows.length === 0) return columns.join(',') + '\n';
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = columns.join(',');
  const body = rows.map(row => columns.map(c => escape(row[c])).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

// ---------------------------------------------------------------------------
// Helper: fetch tabella pubblica via PostgREST
// ---------------------------------------------------------------------------
async function exportTable(table, columns) {
  const cols = columns.join(',');
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${cols}&limit=10000`;
  process.stdout.write(`⬇️   Esportando ${table} ... `);

  const res = await fetch(url, { headers });
  if (res.status === 404 || res.status === 400) {
    console.log('⚠️  tabella non trovata — saltata.');
    return;
  }
  if (!res.ok) {
    const txt = await res.text();
    console.log(`❌  errore HTTP ${res.status}: ${txt}`);
    return;
  }

  const rows = await res.json();
  const csv = toCSV(rows, columns);
  const outFile = join(DATA_DIR, `${table}.csv`);
  writeFileSync(outFile, csv, 'utf8');
  console.log(`✅  ${rows.length} righe → ${table}.csv`);
}

// ---------------------------------------------------------------------------
// Helper: esporta auth.users via Admin API
// ---------------------------------------------------------------------------
async function exportAuthUsers() {
  process.stdout.write('⬇️   Esportando auth.users (via Admin API) ... ');

  let allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/auth/v1/admin/users?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const txt = await res.text();
      console.log(`❌  errore HTTP ${res.status}: ${txt}`);
      return;
    }

    const data = await res.json();
    const users = data.users ?? [];
    allUsers = allUsers.concat(users);

    if (users.length < perPage) break;
    page++;
  }

  // Crea CSV con colonne attese da migrate_auth.sh
  // encrypted_password sarà vuoto → utenti dovranno fare reset password
  const columns = ['id', 'email', 'encrypted_password', 'created_at', 'updated_at'];
  const rows = allUsers.map(u => ({
    id: u.id,
    email: u.email,
    encrypted_password: '', // non accessibile via API
    created_at: u.created_at,
    updated_at: u.updated_at,
  }));

  const csv = toCSV(rows, columns);
  const outFile = join(DATA_DIR, 'auth_users.csv');
  writeFileSync(outFile, csv, 'utf8');
  console.log(`✅  ${allUsers.length} utenti → auth_users.csv`);
  console.log('    ⚠️  Le password NON sono migrate (limite API). Gli utenti dovranno fare reset password.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   Revisioni Legali — Export Supabase via REST API        ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');
console.log(`🔗  URL: ${SUPABASE_URL}`);
console.log(`📂  Output: ${DATA_DIR}`);
console.log('');

// Test connessione
const testRes = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
if (!testRes.ok && testRes.status !== 400) {
  console.error(`❌  Connessione fallita (HTTP ${testRes.status}). Verifica SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.`);
  process.exit(1);
}
console.log('✅  Connessione OK\n');

console.log('=== Tabelle AUTH ===');
await exportAuthUsers();
await exportTable('user_profiles', [
  'id','tenant_id','role','full_name','phone','signature_text','is_active','created_at','updated_at'
]);

console.log('\n=== Tabelle TENANT ===');
await exportTable('plans', [
  'id','name','max_assignments','max_users','storage_gb','ai_quota',
  'vigilance_module','ai_drafts_module','advanced_import','is_active','created_at'
]);
await exportTable('tenants', [
  'id','name','referent_name','phone','vat_number','timezone','logo_url',
  'status','plan_id','plan_expires_at','onboarding_completed','created_at','updated_at'
]);

console.log('\n=== Tabelle COMPANY ===');
await exportTable('companies', [
  'id','tenant_id','name','fiscal_code','vat_number','sector',
  'address','city','province','notes','is_archived','created_at','updated_at'
]);

console.log('\n=== Tabelle ASSIGNMENT ===');
await exportTable('assignments', [
  'id','tenant_id','company_id','year','type','status','notes',
  'created_by','created_at','updated_at'
]);
await exportTable('assignment_members', [
  'id','assignment_id','user_id','role','created_at'
]);
await exportTable('quarters', [
  'id','assignment_id','tenant_id','quarter','status','notes',
  'closed_at','created_at','updated_at'
]);

console.log('\n=== Tabelle AUDIT ===');
await exportTable('working_papers', [
  'id','tenant_id','quarter_id','assignment_id','title','area','content','status',
  'prepared_by','reviewed_by','reviewed_at','created_at','updated_at'
]);
await exportTable('findings', [
  'id','tenant_id','quarter_id','assignment_id','working_paper_id','title',
  'description','recommendation','severity','status','response',
  'due_date','closed_at','raised_by','created_at','updated_at'
]);
await exportTable('vigilanza_items', [
  'id','tenant_id','quarter_id','item','category','sort_order','done',
  'notes','completed_by','completed_at','created_at','updated_at'
]);

console.log('\n=== Tabelle DOCUMENT ===');
await exportTable('documents', [
  'id','tenant_id','quarter_id','assignment_id','name','file_path','file_size',
  'mime_type','category','notes','uploaded_by','created_at','updated_at'
]);
await exportTable('drafts', [
  'id','tenant_id','assignment_id','quarter_id','title','type','content',
  'status','created_by','created_at','updated_at'
]);

console.log('\n=== Tabelle ACCOUNTING ===');
await exportTable('accounting_imports', [
  'id','tenant_id','assignment_id','quarter_id','file_name','file_type',
  'status','entry_count','error_message','imported_by','created_at','updated_at'
]);
await exportTable('accounting_entries', [
  'id','tenant_id','import_id','account_code','account_name','balance',
  'balance_prev','pdf_section','voce_standard','created_at','updated_at'
]);

console.log('\n✅  Export completato. File CSV in:', DATA_DIR);
console.log('\nProssimo step:');
console.log('  cd refactor/backend/scripts && ./run_migrations.sh\n');
