#!/usr/bin/env node
/**
 * e2e-test.js — Test E2E completo — Fase 4 Validazione
 *
 * Prerequisiti:
 *   - docker compose up --build (tutti i container attivi)
 *   - node refactor/backend/scripts/seed_test_data.js  (dati di test presenti)
 *
 * Esecuzione:
 *   node refactor/backend/e2e-test.js
 *
 * Copre:
 *   4.2 — Flusso onboarding
 *   4.3 — Flusso incarico completo (company → assignment → WP → finding → draft)
 *   4.4 — Import contabile (upload CSV → parsing → AI → entries)
 *   4.5 — Vigilanza (init da template → completa voci)
 *   4.6 — Area admin (super_admin: lista, crea, modifica piano)
 *   4.7 — Tenant isolation (TenantB non vede dati TenantA)
 *   4.8 — RBAC ruoli (collaborator/revisor limitati)
 *   4.9 — JWT security (no token, malformato, scaduto)
 */

'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ---------------------------------------------------------------------------
// Configurazione
// ---------------------------------------------------------------------------
const GW = process.env.GATEWAY_URL || 'http://localhost:8080';

const CREDS = {
  superAdmin: { email: 'admin@revisionilegali.it', password: 'Admin1234!' },
  ownerA:     { email: 'tenantA@test.it',          password: 'TenantA123!' },
  ownerB:     { email: 'tenantB@test.it',          password: 'TenantB123!' },
  collab:     { email: 'collab@test.it',            password: 'Collab123!' },
  revisor:    { email: 'revisor@test.it',           password: 'Revisor123!' },
};

// IDs fissi dal seed (devono corrispondere a seed_test_data.js)
const TENANT_A_ID = '10000000-0000-0000-0000-000000000001';
const TENANT_B_ID = '10000000-0000-0000-0000-000000000002';
const PLAN_GOLD   = '00000000-0000-0000-0000-000000000003';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  passed++;
}

function fail(label, reason) {
  console.error(`  \x1b[31m✗\x1b[0m ${label}`);
  if (reason) console.error(`    → ${reason}`);
  failed++;
  failures.push({ label, reason });
}

function section(title) {
  console.log(`\n\x1b[36m▶ ${title}\x1b[0m`);
}

function request(method, url, { body, headers, isMultipart } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const data   = (!isMultipart && body) ? JSON.stringify(body) : body;

    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Accept': 'application/json',
        ...((!isMultipart && data) ? {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(data),
        } : {}),
        ...(headers || {}),
      },
    };

    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let json;
        try { json = JSON.parse(raw); } catch { json = raw; }
        resolve({ status: res.statusCode, body: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const get   = (url, hdrs)      => request('GET',    url, { headers: hdrs });
const post  = (url, body, hdrs) => request('POST',   url, { body, headers: hdrs });
const patch = (url, body, hdrs) => request('PATCH',  url, { body, headers: hdrs });
const del   = (url, hdrs)       => request('DELETE', url, { headers: hdrs });
const auth  = (token)           => ({ Authorization: `Bearer ${token}` });

async function login(creds) {
  const r = await post(`${GW}/api/auth/login`, creds);
  if (r.status === 200 && r.body?.access_token) return r.body.access_token;
  return null;
}

// ---------------------------------------------------------------------------
// Setup: login tutti gli utenti
// ---------------------------------------------------------------------------
async function setupTokens() {
  section('0. Setup — login utenti test');
  const tokens = {};
  for (const [name, creds] of Object.entries(CREDS)) {
    const token = await login(creds);
    if (token) {
      tokens[name] = token;
      ok(`login ${creds.email}`);
    } else {
      fail(`login ${creds.email}`, 'Seed dati non eseguito o auth-service non disponibile');
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// 4.2 — Flusso Onboarding
// ---------------------------------------------------------------------------
async function testOnboarding(tokens) {
  section('4.2 — Flusso Onboarding');

  if (!tokens.ownerA) { fail('onboarding setup', 'Token ownerA non disponibile'); return; }

  // Crea un tenant con onboarding_completed=false per testare il flusso
  // (usiamo super_admin per creare il tenant di test)
  let onboardingTenantId = null;
  if (tokens.superAdmin) {
    try {
      const r = await post(`${GW}/api/tenants`, {
        name:        'Studio Onboarding Test',
        plan_id:     PLAN_GOLD,
        owner_email: 'onboarding_test@test.it',
        slug:        'studio-onboarding-test',
      }, auth(tokens.superAdmin));
      if (r.status === 201 && r.body?.id) {
        onboardingTenantId = r.body.id;
        ok(`super_admin crea tenant → id: ${onboardingTenantId}`);
      } else {
        fail('super_admin crea tenant', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      }
    } catch (e) {
      fail('super_admin crea tenant', e.message);
    }
  }

  // Verifica tenant_owner vede il proprio tenant
  try {
    const r = await get(`${GW}/api/tenants/${TENANT_A_ID}/status`, auth(tokens.ownerA));
    if (r.status === 200 && r.body?.id) {
      ok(`GET /api/tenants/:id/status → 200`);
      if (r.body.onboarding_completed === true) {
        ok('onboarding_completed: true (ownerA ha già completato onboarding)');
      } else {
        fail('onboarding_completed', `Atteso true, ottenuto: ${r.body.onboarding_completed}`);
      }
    } else {
      fail('GET tenant status', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    fail('GET tenant status', e.message);
  }

  // Completa onboarding
  try {
    const r = await post(`${GW}/api/tenants/onboarding`, {
      name:            'Studio A (aggiornato)',
      referente:       'Mario Rossi',
      phone:           '+39 02 1234567',
      timezone:        'Europe/Rome',
    }, auth(tokens.ownerA));
    if (r.status === 200) {
      ok('POST /api/tenants/onboarding → 200');
    } else if (r.status === 400 && r.body?.error?.includes('già completato')) {
      ok('POST /api/tenants/onboarding → già completato (idempotente)');
    } else {
      fail('POST /api/tenants/onboarding', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    fail('POST /api/tenants/onboarding', e.message);
  }

  // Non-super_admin non può accedere a /api/tenants (lista globale)
  try {
    const r = await get(`${GW}/api/tenants`, auth(tokens.ownerA));
    if (r.status === 403) {
      ok('tenant_owner non può fare GET /api/tenants (lista globale) → 403');
    } else {
      fail('RBAC: tenant_owner GET /api/tenants', `Atteso 403, ottenuto HTTP ${r.status}`);
    }
  } catch (e) {
    fail('RBAC: tenant_owner GET /api/tenants', e.message);
  }
}

// ---------------------------------------------------------------------------
// 4.3 — Flusso Incarico Completo
// ---------------------------------------------------------------------------
async function testAssignmentFlow(tokens) {
  section('4.3 — Flusso Incarico Completo');

  if (!tokens.ownerA) { fail('assignment flow setup', 'Token ownerA non disponibile'); return; }
  const hdrs = auth(tokens.ownerA);
  const state = {};

  // Crea azienda
  try {
    const r = await post(`${GW}/api/companies`, {
      name:             'Beta Srl (e2e test)',
      fiscal_code:      'E2ETEST00A00A000Y',
      company_type:     'srl',
      fiscal_year_end:  '12-31',
      primary_activity: 'Industria',
      city:             'Milano',
      province:         'MI',
    }, hdrs);
    if (r.status === 201 && r.body?.id) {
      state.companyId = r.body.id;
      ok(`crea azienda → ${state.companyId}`);
    } else {
      fail('crea azienda', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      return;
    }
  } catch (e) { fail('crea azienda', e.message); return; }

  // Crea incarico
  try {
    const r = await post(`${GW}/api/assignments`, {
      company_id:  state.companyId,
      name:        'Revisione 2025 (e2e)',
      type:        'revisione_legale',
      year:        2025,
      start_date:  '2025-01-01',
      end_date:    '2025-12-31',
    }, hdrs);
    if (r.status === 201 && r.body?.id) {
      state.assignmentId = r.body.id;
      ok(`crea incarico → ${state.assignmentId}`);
    } else {
      fail('crea incarico', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      return;
    }
  } catch (e) { fail('crea incarico', e.message); return; }

  // Verifica 4 trimestri auto-creati
  try {
    const r = await get(`${GW}/api/assignments/${state.assignmentId}/quarters`, hdrs);
    if (r.status === 200 && Array.isArray(r.body) && r.body.length === 4) {
      state.quarterId = r.body[0].id;
      ok(`4 trimestri auto-creati → quarterId: ${state.quarterId}`);
    } else {
      const count = Array.isArray(r.body) ? r.body.length : '?';
      fail(`4 trimestri auto-creati`, `HTTP ${r.status}, n trimestri: ${count}`);
    }
  } catch (e) { fail('4 trimestri', e.message); }

  // Crea carta di lavoro
  if (state.quarterId) {
    try {
      const r = await post(`${GW}/api/audit/working-papers`, {
        quarter_id:  state.quarterId,
        assignment_id: state.assignmentId,
        title:       'WP-001 Cassa Banche (e2e)',
        area:        'cassa_banche',
        content:     JSON.stringify({ items: [{ text: 'Verifica saldi', done: false }] }),
      }, hdrs);
      if (r.status === 201 && r.body?.id) {
        state.wpId = r.body.id;
        ok(`crea carta di lavoro → ${state.wpId}`);
      } else {
        fail('crea carta di lavoro', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      }
    } catch (e) { fail('crea carta di lavoro', e.message); }
  }

  // State machine WP: in_revisione → approvata
  if (state.wpId) {
    try {
      const r1 = await patch(`${GW}/api/audit/working-papers/${state.wpId}`,
        { status: 'in_revisione' }, hdrs);
      if (r1.status === 200) ok('WP stato: in_revisione');
      else fail('WP stato: in_revisione', `HTTP ${r1.status}`);

      const r2 = await patch(`${GW}/api/audit/working-papers/${state.wpId}`,
        { status: 'approvata' }, hdrs);
      if (r2.status === 200) ok('WP stato: approvata');
      else fail('WP stato: approvata', `HTTP ${r2.status}`);
    } catch (e) { fail('WP state machine', e.message); }
  }

  // Crea rilievo
  if (state.quarterId) {
    try {
      const r = await post(`${GW}/api/audit/findings`, {
        quarter_id:     state.quarterId,
        assignment_id:  state.assignmentId,
        title:          'Rilievo test (e2e)',
        description:    'Descrizione rilievo di test',
        recommendation: 'Raccomandazione test',
        severity:       'media',
      }, hdrs);
      if (r.status === 201 && r.body?.id) {
        state.findingId = r.body.id;
        ok(`crea rilievo → ${state.findingId}`);
      } else {
        fail('crea rilievo', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      }
    } catch (e) { fail('crea rilievo', e.message); }
  }

  // Chiudi rilievo (closed_at auto)
  if (state.findingId) {
    try {
      const r = await patch(`${GW}/api/audit/findings/${state.findingId}`,
        { status: 'chiuso' }, hdrs);
      if (r.status === 200 && r.body?.closed_at) {
        ok(`rilievo chiuso → closed_at: ${r.body.closed_at}`);
      } else if (r.status === 200) {
        fail('rilievo chiuso — closed_at non impostato', `body: ${JSON.stringify(r.body)}`);
      } else {
        fail('chiudi rilievo', `HTTP ${r.status}`);
      }
    } catch (e) { fail('chiudi rilievo', e.message); }
  }

  // Crea bozza con template
  try {
    const r = await post(`${GW}/api/drafts`, {
      assignment_id: state.assignmentId,
      title:         'Relazione finale (e2e)',
      type:          'relazione_revisione',
    }, hdrs);
    if (r.status === 201 && r.body?.id) {
      state.draftId = r.body.id;
      const hasContent = r.body.content && r.body.content.length > 10;
      ok(`crea bozza → ${state.draftId} (template: ${hasContent ? 'generato' : 'vuoto'})`);
    } else {
      fail('crea bozza', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    }
  } catch (e) { fail('crea bozza', e.message); }

  // Finalizza bozza
  if (state.draftId) {
    try {
      const r = await patch(`${GW}/api/drafts/${state.draftId}`,
        { status: 'definitivo' }, hdrs);
      if (r.status === 200) ok('bozza → definitivo');
      else fail('bozza definitivo', `HTTP ${r.status}`);
    } catch (e) { fail('bozza definitivo', e.message); }
  }

  // Chiudi incarico
  try {
    const r = await patch(`${GW}/api/assignments/${state.assignmentId}`,
      { status: 'chiuso' }, hdrs);
    if (r.status === 200) ok('incarico → chiuso');
    else fail('chiudi incarico', `HTTP ${r.status}`);
  } catch (e) { fail('chiudi incarico', e.message); }

  return state;
}

// ---------------------------------------------------------------------------
// 4.4 — Import Contabile
// ---------------------------------------------------------------------------
async function testAccountingImport(tokens, state) {
  section('4.4 — Import Contabile');

  if (!tokens.ownerA || !state?.assignmentId) {
    fail('accounting import setup', 'Token ownerA o assignmentId non disponibili — skip');
    return;
  }

  // Crea un CSV minimale come buffer
  const csvContent = `codice,descrizione,saldo_corrente,saldo_precedente
1100,Cassa,15000.00,12000.00
1200,Banca c/c,85000.00,70000.00
1300,Crediti clienti,45000.00,40000.00
2100,Debiti fornitori,25000.00,22000.00
3100,Capitale sociale,100000.00,100000.00
4100,Ricavi vendite,250000.00,220000.00
5100,Costi acquisto,150000.00,130000.00`;

  // Costruisce multipart manualmente
  const boundary = 'e2eboundary12345';
  const CRLF = '\r\n';
  const csvBuffer = Buffer.from(csvContent);

  const bodyParts = [
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="file"; filename="bilancio_test.csv"${CRLF}`,
    `Content-Type: text/csv${CRLF}${CRLF}`,
    csvBuffer.toString(),
    `${CRLF}--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="assignment_id"${CRLF}${CRLF}`,
    state.assignmentId,
    `${CRLF}--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="quarter_id"${CRLF}${CRLF}`,
    state.quarterId || '',
    `${CRLF}--${boundary}--${CRLF}`,
  ].join('');

  const bodyBuffer = Buffer.from(bodyParts);

  try {
    const r = await request('POST', `${GW}/api/accounting/imports`, {
      body: bodyBuffer,
      isMultipart: true,
      headers: {
        Authorization:  `Bearer ${tokens.ownerA}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
      },
    });

    if (r.status === 201 || r.status === 202) {
      const importId = r.body?.id;
      ok(`upload CSV import → HTTP ${r.status}, id: ${importId}`);

      if (importId) {
        // Polling status (max 15 tentativi × 2s = 30s)
        let finalStatus = null;
        for (let i = 0; i < 15; i++) {
          await new Promise((res) => setTimeout(res, 2000));
          const poll = await get(`${GW}/api/accounting/imports/${importId}`,
            auth(tokens.ownerA));
          if (poll.status === 200) {
            finalStatus = poll.body?.status;
            if (finalStatus === 'completed' || finalStatus === 'error') break;
          }
        }

        if (finalStatus === 'completed') {
          ok(`import completato (status: completed)`);

          // Controlla entries
          const entries = await get(
            `${GW}/api/accounting/imports/${importId}/entries`,
            auth(tokens.ownerA));
          if (entries.status === 200 && Array.isArray(entries.body) && entries.body.length > 0) {
            ok(`entries presenti: ${entries.body.length} voci`);
          } else {
            fail('entries import', `HTTP ${entries.status}, n: ${Array.isArray(entries.body) ? entries.body.length : '?'}`);
          }
        } else if (finalStatus === 'error') {
          fail('import status', `status: error — probabile problema AI o parser`);
        } else {
          fail('import status polling', `Status finale: ${finalStatus} (atteso: completed)`);
        }
      }
    } else {
      fail('upload CSV import', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    fail('upload CSV import', e.message);
  }
}

// ---------------------------------------------------------------------------
// 4.5 — Vigilanza
// ---------------------------------------------------------------------------
async function testVigilanza(tokens, state) {
  section('4.5 — Vigilanza');

  if (!tokens.ownerA || !state?.quarterId) {
    fail('vigilanza setup', 'Token ownerA o quarterId non disponibili — skip');
    return;
  }

  const hdrs = auth(tokens.ownerA);

  // Init checklist da template
  try {
    const r = await post(`${GW}/api/audit/vigilanza/init`,
      { quarter_id: state.quarterId, assignment_id: state.assignmentId }, hdrs);
    if (r.status === 201) {
      const count = Array.isArray(r.body) ? r.body.length : '?';
      ok(`init vigilanza → ${count} voci create`);
    } else if (r.status === 409) {
      ok('init vigilanza → 409 (già esistente — idempotente)');
    } else {
      fail('init vigilanza', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    }
  } catch (e) { fail('init vigilanza', e.message); }

  // Idempotenza: seconda chiamata → 409
  try {
    const r = await post(`${GW}/api/audit/vigilanza/init`,
      { quarter_id: state.quarterId, assignment_id: state.assignmentId }, hdrs);
    if (r.status === 409) {
      ok('init vigilanza (seconda chiamata) → 409 idempotente');
    } else if (r.status === 201) {
      fail('init vigilanza idempotenza', `Atteso 409, ottenuto 201 (doppio init)`);
    } else {
      fail('init vigilanza seconda chiamata', `HTTP ${r.status}`);
    }
  } catch (e) { fail('init vigilanza idempotenza', e.message); }

  // Lista voci
  let itemId = null;
  try {
    const r = await get(`${GW}/api/audit/vigilanza?quarter_id=${state.quarterId}`, hdrs);
    if (r.status === 200 && Array.isArray(r.body) && r.body.length >= 14) {
      itemId = r.body[0]?.id;
      ok(`lista vigilanza → ${r.body.length} voci (atteso ≥14)`);
    } else {
      const count = Array.isArray(r.body) ? r.body.length : '?';
      fail('lista vigilanza', `HTTP ${r.status}, n: ${count}`);
    }
  } catch (e) { fail('lista vigilanza', e.message); }

  // Completa voce
  if (itemId) {
    try {
      const r = await patch(`${GW}/api/audit/vigilanza/${itemId}`, { done: true }, hdrs);
      if (r.status === 200 && r.body?.completed_at) {
        ok(`completa voce vigilanza → completed_at: ${r.body.completed_at}`);
      } else if (r.status === 200) {
        fail('completa voce — completed_at non impostato', `body: ${JSON.stringify(r.body)}`);
      } else {
        fail('completa voce vigilanza', `HTTP ${r.status}`);
      }
    } catch (e) { fail('completa voce vigilanza', e.message); }

    // De-seleziona
    try {
      const r = await patch(`${GW}/api/audit/vigilanza/${itemId}`, { done: false }, hdrs);
      if (r.status === 200 && !r.body?.completed_at) {
        ok(`de-seleziona voce vigilanza → completed_at: null`);
      } else if (r.status === 200) {
        ok(`de-seleziona voce vigilanza → HTTP 200`);
      } else {
        fail('de-seleziona voce vigilanza', `HTTP ${r.status}`);
      }
    } catch (e) { fail('de-seleziona voce vigilanza', e.message); }
  }
}

// ---------------------------------------------------------------------------
// 4.6 — Area Admin
// ---------------------------------------------------------------------------
async function testAdminArea(tokens) {
  section('4.6 — Area Admin');

  if (!tokens.superAdmin) { fail('admin area setup', 'Token superAdmin non disponibile'); return; }
  const hdrs = auth(tokens.superAdmin);

  // Lista tenant (solo super_admin)
  try {
    const r = await get(`${GW}/api/tenants`, hdrs);
    if (r.status === 200 && Array.isArray(r.body) && r.body.length >= 2) {
      ok(`GET /api/tenants → ${r.body.length} tenant`);
    } else {
      fail('GET /api/tenants (super_admin)', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    }
  } catch (e) { fail('GET /api/tenants', e.message); }

  // Lista piani
  try {
    const r = await get(`${GW}/api/plans`, hdrs);
    if (r.status === 200 && Array.isArray(r.body) && r.body.length >= 3) {
      ok(`GET /api/plans → ${r.body.length} piani`);
    } else {
      fail('GET /api/plans', `HTTP ${r.status}`);
    }
  } catch (e) { fail('GET /api/plans', e.message); }

  // Modifica piano del tenant A → Gold
  try {
    const r = await patch(`${GW}/api/tenants/${TENANT_A_ID}`, { plan_id: PLAN_GOLD }, hdrs);
    if (r.status === 200) {
      ok(`PATCH /api/tenants/:id (cambia piano) → 200`);
    } else {
      fail('PATCH /api/tenants (piano)', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    }
  } catch (e) { fail('PATCH /api/tenants (piano)', e.message); }

  // Tenant owner non può fare GET /api/tenants (lista globale)
  if (tokens.ownerA) {
    try {
      const r = await get(`${GW}/api/tenants`, auth(tokens.ownerA));
      if (r.status === 403) {
        ok('tenant_owner non può fare GET /api/tenants → 403');
      } else {
        fail('RBAC: tenant_owner GET /api/tenants', `Atteso 403, ottenuto ${r.status}`);
      }
    } catch (e) { fail('RBAC: tenant_owner GET /api/tenants', e.message); }
  }
}

// ---------------------------------------------------------------------------
// 4.7 — Tenant Isolation
// ---------------------------------------------------------------------------
async function testTenantIsolation(tokens, state) {
  section('4.7 — Tenant Isolation');

  if (!tokens.ownerB || !state?.companyId) {
    fail('isolation setup', 'Token ownerB o dati TenantA non disponibili — skip');
    return;
  }

  const hdrsB = auth(tokens.ownerB);

  // Lista aziende: TenantB non deve vedere aziende di TenantA
  try {
    const r = await get(`${GW}/api/companies`, hdrsB);
    if (r.status === 200 && Array.isArray(r.body)) {
      const leaked = r.body.some((c) => c.id === state.companyId);
      if (!leaked) ok('TenantB non vede aziende di TenantA in lista');
      else fail('ISOLATION BREACH: TenantB vede aziende di TenantA!');
    } else {
      fail('GET /api/companies (TenantB)', `HTTP ${r.status}`);
    }
  } catch (e) { fail('lista aziende isolamento', e.message); }

  // Accesso diretto all'azienda di TenantA → 403/404
  try {
    const r = await get(`${GW}/api/companies/${state.companyId}`, hdrsB);
    if (r.status === 403 || r.status === 404) {
      ok(`TenantB → GET /api/companies/:id_A → ${r.status}`);
    } else {
      fail(`ISOLATION BREACH: TenantB accede a azienda di TenantA → ${r.status}`);
    }
  } catch (e) { fail('GET company isolamento', e.message); }

  // Incarico di TenantA → 403/404
  if (state.assignmentId) {
    try {
      const r = await get(`${GW}/api/assignments/${state.assignmentId}`, hdrsB);
      if (r.status === 403 || r.status === 404) {
        ok(`TenantB → GET /api/assignments/:id_A → ${r.status}`);
      } else {
        fail(`ISOLATION BREACH: TenantB accede a incarico di TenantA → ${r.status}`);
      }
    } catch (e) { fail('GET assignment isolamento', e.message); }
  }

  // Carta di lavoro di TenantA → 403/404
  if (state.wpId) {
    try {
      const r = await get(`${GW}/api/audit/working-papers/${state.wpId}`, hdrsB);
      if (r.status === 403 || r.status === 404) {
        ok(`TenantB → GET /api/audit/working-papers/:id_A → ${r.status}`);
      } else {
        fail(`ISOLATION BREACH: TenantB accede a carta di TenantA → ${r.status}`);
      }
    } catch (e) { fail('GET working-paper isolamento', e.message); }
  }

  // PATCH azienda di TenantA → 403/404
  try {
    const r = await patch(`${GW}/api/companies/${state.companyId}`,
      { name: 'HACKED' }, hdrsB);
    if (r.status === 403 || r.status === 404) {
      ok(`TenantB → PATCH /api/companies/:id_A → ${r.status}`);
    } else {
      fail(`ISOLATION BREACH: TenantB ha modificato azienda di TenantA → ${r.status}`);
    }
  } catch (e) { fail('PATCH company isolamento', e.message); }
}

// ---------------------------------------------------------------------------
// 4.8 — RBAC Ruoli
// ---------------------------------------------------------------------------
async function testRbac(tokens, state) {
  section('4.8 — RBAC Ruoli');

  if (!tokens.collab || !tokens.revisor) {
    fail('RBAC setup', 'Token collaborator o revisor non disponibili — skip');
    return;
  }

  const hdrsC = auth(tokens.collab);
  const hdrsR = auth(tokens.revisor);

  // Collaborator può leggere aziende
  try {
    const r = await get(`${GW}/api/companies`, hdrsC);
    if (r.status === 200) ok('collaborator GET /api/companies → 200 (lettura OK)');
    else fail('collaborator GET /api/companies', `HTTP ${r.status}`);
  } catch (e) { fail('collaborator GET companies', e.message); }

  // Collaborator non può creare aziende
  try {
    const r = await post(`${GW}/api/companies`, {
      name: 'Azienda Non Autorizzata',
      fiscal_code: 'NOAUTH00A00A000X',
    }, hdrsC);
    if (r.status === 403) ok('collaborator POST /api/companies → 403 (bloccato)');
    else fail('RBAC: collaborator POST /api/companies', `Atteso 403, ottenuto ${r.status}`);
  } catch (e) { fail('RBAC collaborator POST companies', e.message); }

  // Collaborator non può gestire utenti
  try {
    const r = await get(`${GW}/api/auth/users`, hdrsC);
    if (r.status === 403) ok('collaborator GET /api/auth/users → 403');
    else fail('RBAC: collaborator GET /api/auth/users', `Atteso 403, ottenuto ${r.status}`);
  } catch (e) { fail('RBAC collaborator GET users', e.message); }

  // Revisor può creare carte di lavoro
  if (state?.quarterId) {
    try {
      const r = await post(`${GW}/api/audit/working-papers`, {
        quarter_id:   state.quarterId,
        assignment_id: state.assignmentId,
        title:        'WP-Revisor (e2e)',
        area:         'crediti_clienti',
        content:      JSON.stringify({ items: [] }),
      }, hdrsR);
      if (r.status === 201) ok('revisor POST /api/audit/working-papers → 201');
      else fail('RBAC: revisor POST working-papers', `HTTP ${r.status}`);
    } catch (e) { fail('RBAC revisor POST working-papers', e.message); }
  }

  // Collaborator non può chiudere incarico
  if (state?.assignmentId) {
    try {
      const r = await patch(`${GW}/api/assignments/${state.assignmentId}`,
        { status: 'chiuso' }, hdrsC);
      if (r.status === 403) ok('collaborator PATCH assignment chiudi → 403');
      else fail('RBAC: collaborator chiude incarico', `Atteso 403, ottenuto ${r.status}`);
    } catch (e) { fail('RBAC collaborator chiudi incarico', e.message); }
  }

  // Revisor non può chiudere incarico (solo owner)
  if (state?.assignmentId) {
    try {
      const r = await patch(`${GW}/api/assignments/${state.assignmentId}`,
        { status: 'chiuso' }, hdrsR);
      if (r.status === 403) ok('revisor PATCH assignment chiudi → 403 (solo owner)');
      else if (r.status === 200) fail('RBAC: revisor ha chiuso incarico', 'Atteso 403');
      else fail('RBAC: revisor PATCH assignment', `HTTP ${r.status}`);
    } catch (e) { fail('RBAC revisor chiudi incarico', e.message); }
  }
}

// ---------------------------------------------------------------------------
// 4.9 — JWT Security
// ---------------------------------------------------------------------------
async function testJwtSecurity() {
  section('4.9 — JWT Security');

  const endpoints = [
    `${GW}/api/companies`,
    `${GW}/api/assignments`,
    `${GW}/api/audit/working-papers`,
    `${GW}/api/documents`,
    `${GW}/api/accounting/imports`,
  ];

  // Nessun token
  for (const url of endpoints) {
    try {
      const r = await get(url);
      if (r.status === 401) ok(`no token → ${url.replace(GW, '')} → 401`);
      else fail(`no token → ${url.replace(GW, '')}`, `Atteso 401, ottenuto ${r.status}`);
    } catch (e) { fail(`no token ${url}`, e.message); }
  }

  // Token malformato
  try {
    const r = await get(`${GW}/api/companies`, { Authorization: 'Bearer notavalidjwt' });
    if (r.status === 401) ok('token malformato → 401');
    else fail('token malformato', `Atteso 401, ottenuto ${r.status}`);
  } catch (e) { fail('token malformato', e.message); }

  // Token con firma sbagliata (header.payload.WRONG_SIG)
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InN1cGVyX2FkbWluIn0.INVALIDSIGNATURE';
  try {
    const r = await get(`${GW}/api/companies`, { Authorization: `Bearer ${fakeToken}` });
    if (r.status === 401) ok('token firma errata → 401');
    else fail('token firma errata', `Atteso 401, ottenuto ${r.status}`);
  } catch (e) { fail('token firma errata', e.message); }

  // Token scaduto (exp nel 2020)
  // eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxNTc3ODM2ODAwfQ.<sig>
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxNTc3ODM2ODAwLCJyb2xlIjoidGVuYW50X293bmVyIn0.EXPIREDSIG';
  try {
    const r = await get(`${GW}/api/companies`, { Authorization: `Bearer ${expiredToken}` });
    if (r.status === 401) ok('token scaduto → 401');
    else fail('token scaduto', `Atteso 401, ottenuto ${r.status}`);
  } catch (e) { fail('token scaduto', e.message); }

  // Tenant service protetto
  try {
    const r = await get(`${GW}/api/tenants/${TENANT_A_ID}/status`);
    if (r.status === 401) ok('GET /api/tenants/:id/status senza token → 401');
    else fail('tenant status senza token', `Atteso 401, ottenuto ${r.status}`);
  } catch (e) { fail('tenant status senza token', e.message); }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\x1b[1m=== E2E Test — Fase 4 Validazione — revisionilegali ===\x1b[0m');
  console.log(`Gateway: ${GW}\n`);

  try {
    const tokens = await setupTokens();

    // Controlla che almeno ownerA sia disponibile (altrimenti il seed non è stato eseguito)
    if (!tokens.ownerA && !tokens.superAdmin) {
      console.error('\n\x1b[31mNessun token disponibile.\x1b[0m');
      console.error('Esegui prima: node refactor/backend/scripts/seed_test_data.js');
      process.exit(1);
    }

    await testOnboarding(tokens);
    const state = await testAssignmentFlow(tokens) || {};
    await testAccountingImport(tokens, state);
    await testVigilanza(tokens, state);
    await testAdminArea(tokens);
    await testTenantIsolation(tokens, state);
    await testRbac(tokens, state);
    await testJwtSecurity();

  } catch (e) {
    console.error('\n\x1b[31mErrore inatteso:\x1b[0m', e.message, e.stack);
  }

  // Report finale
  console.log('\n' + '='.repeat(55));
  console.log(`\x1b[1mRisultato: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m`);

  if (failures.length > 0) {
    console.log('\n\x1b[31mTest falliti:\x1b[0m');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.label}${f.reason ? ` — ${f.reason}` : ''}`));
  }

  if (failed === 0) {
    console.log('\n\x1b[1m\x1b[32m✓ Tutti i test superati — Fase 4 completata!\x1b[0m');
    console.log('Pronto per il merge in main: git checkout main && git merge refactor/microservices-architecture\n');
  } else {
    console.log('\n\x1b[33mRisolvere i test falliti prima del merge in main.\x1b[0m\n');
    process.exit(1);
  }
}

main();
