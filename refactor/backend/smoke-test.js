#!/usr/bin/env node
/**
 * smoke-test.js — Smoke test backend completo
 *
 * Prerequisiti: docker compose up --build (tutti i container attivi)
 * Esecuzione:   node smoke-test.js
 *
 * Cosa testa:
 *   1. Health check di ogni servizio (via gateway + diretto)
 *   2. Flusso completo: login → onboarding tenant → crea azienda → crea incarico → crea carta di lavoro
 *   3. Isolamento multi-tenant: due tenant diversi non si vedono i dati
 */

'use strict';

const http  = require('http');
const https = require('https');

// ---------------------------------------------------------------------------
// Configurazione
// ---------------------------------------------------------------------------
const GW   = 'http://localhost:8080';   // API Gateway
const DIRECT = {                        // Accesso diretto (bypassando nginx)
  auth:        'http://localhost:3001',
  tenant:      'http://localhost:3002',
  company:     'http://localhost:3003',
  assignment:  'http://localhost:3004',
  audit:       'http://localhost:3005',
  document:    'http://localhost:3006',
  accounting:  'http://localhost:3007',
};

// Credenziali di test (devono esistere nel DB — usa il seed SQL)
const SUPER_ADMIN = { email: 'admin@revisionilegali.it', password: 'Admin1234!' };
const TENANT_A    = { email: 'tenantA@test.it',          password: 'TenantA123!' };
const TENANT_B    = { email: 'tenantB@test.it',          password: 'TenantB123!' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  passed++;
}

function fail(label, reason) {
  console.error(`  \x1b[31m✗\x1b[0m ${label}`);
  if (reason) console.error(`    → ${reason}`);
  failed++;
}

function section(title) {
  console.log(`\n\x1b[36m▶ ${title}\x1b[0m`);
}

function request(method, url, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const data   = body ? JSON.stringify(body) : undefined;

    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(headers || {}),
      },
    };

    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
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

async function get(url, headers)      { return request('GET',    url, { headers }); }
async function post(url, body, hdrs)  { return request('POST',   url, { body, headers: hdrs }); }
async function patch(url, body, hdrs) { return request('PATCH',  url, { body, headers: hdrs }); }
async function del(url, headers)      { return request('DELETE', url, { headers }); }

function auth(token) { return { Authorization: `Bearer ${token}` }; }

// ---------------------------------------------------------------------------
// Test 1 — Health check (gateway)
// ---------------------------------------------------------------------------
async function testHealthGateway() {
  section('1. Health check via gateway');

  const routes = [
    ['/api/auth/health',        'auth-service'],
    ['/api/tenants/health',     'tenant-service'],
    ['/api/plans/health',       'tenant-service (plans)'],
    ['/api/companies/health',   'company-service'],
    ['/api/assignments/health', 'assignment-service'],
    ['/api/audit/health',       'audit-service'],
    ['/api/documents/health',   'document-service'],
    ['/api/drafts/health',      'document-service (drafts)'],
    ['/api/accounting/health',  'accounting-service'],
  ];

  for (const [path, label] of routes) {
    try {
      const r = await get(`${GW}${path}`);
      if (r.status === 200 && r.body?.status === 'OK') {
        ok(`${label} → /health`);
      } else {
        fail(`${label} → /health`, `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      }
    } catch (e) {
      fail(`${label} → /health`, e.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Test 2 — Health check diretto (bypassa nginx)
// ---------------------------------------------------------------------------
async function testHealthDirect() {
  section('2. Health check diretto (per-service)');

  for (const [name, base] of Object.entries(DIRECT)) {
    try {
      const r = await get(`${base}/api/health`);
      if (r.status === 200 && r.body?.status === 'OK') {
        ok(`${name}-service diretto`);
      } else {
        fail(`${name}-service diretto`, `HTTP ${r.status}`);
      }
    } catch (e) {
      fail(`${name}-service diretto`, e.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Test 3 — Flusso auth (login, verifica token)
// ---------------------------------------------------------------------------
async function testAuth() {
  section('3. Auth — login + verifica JWT');
  const tokens = {};

  for (const [label, creds] of [['super_admin', SUPER_ADMIN], ['tenantA', TENANT_A], ['tenantB', TENANT_B]]) {
    try {
      const r = await post(`${GW}/api/auth/login`, creds);
      if (r.status === 200 && r.body?.access_token) {
        tokens[label] = r.body.access_token;
        ok(`login ${label}`);
      } else {
        fail(`login ${label}`, `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      }
    } catch (e) {
      fail(`login ${label}`, e.message);
    }
  }

  // Verifica token
  for (const [label, token] of Object.entries(tokens)) {
    if (!token) continue;
    try {
      const r = await get(`${GW}/api/auth/verify`, auth(token));
      if (r.status === 200 && r.body?.valid) {
        ok(`verify token ${label}`);
      } else {
        fail(`verify token ${label}`, `HTTP ${r.status}`);
      }
    } catch (e) {
      fail(`verify token ${label}`, e.message);
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Test 4 — Flusso CRUD base (TenantA: azienda → incarico → carta)
// ---------------------------------------------------------------------------
async function testCrudFlow(tokens) {
  section('4. CRUD flow TenantA');

  if (!tokens.tenantA) {
    fail('CRUD flow', 'Token tenantA non disponibile — skip');
    return {};
  }

  const hdrs = auth(tokens.tenantA);
  let companyId, assignmentId, workingPaperId;

  // Crea azienda
  try {
    const r = await post(`${GW}/api/companies`, {
      name:              'ACME Srl (smoke test)',
      fiscal_code:       'SMKTEST00A00A000X',
      company_type:      'srl',
      fiscal_year_end:   '12-31',
      primary_activity:  'Commercio',
    }, hdrs);
    if (r.status === 201 && r.body?.id) {
      companyId = r.body.id;
      ok(`crea azienda (id: ${companyId})`);
    } else {
      fail('crea azienda', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    fail('crea azienda', e.message);
  }

  // Crea incarico
  if (companyId) {
    try {
      const r = await post(`${GW}/api/assignments`, {
        company_id:   companyId,
        name:         'Revisione 2025 (smoke test)',
        type:         'revisione_legale',
        year:         2025,
        start_date:   '2025-01-01',
        end_date:     '2025-12-31',
      }, hdrs);
      if (r.status === 201 && r.body?.id) {
        assignmentId = r.body.id;
        ok(`crea incarico (id: ${assignmentId})`);
      } else {
        fail('crea incarico', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      }
    } catch (e) {
      fail('crea incarico', e.message);
    }
  }

  // Crea carta di lavoro
  if (assignmentId) {
    try {
      // Recupera il quarter_id (creati automaticamente alla creazione dell'incarico)
      const qr = await get(`${GW}/api/assignments/${assignmentId}/quarters`, hdrs);
      const quarterId = Array.isArray(qr.body) && qr.body.length > 0 ? qr.body[0].id : null;
      if (!quarterId) {
        fail('crea carta di lavoro', `Nessun quarter trovato per l'incarico`);
      } else {
      const r = await post(`${GW}/api/audit/working-papers`, {
        quarter_id:     quarterId,
        title:          'WP-001 Smoke Test',
        area:           'altro',
        content:        JSON.stringify({ items: [{ text: 'Verifica iniziale', done: false }] }),
      }, hdrs);
      if (r.status === 201 && r.body?.id) {
        workingPaperId = r.body.id;
        ok(`crea carta di lavoro (id: ${workingPaperId})`);
      } else {
        fail('crea carta di lavoro', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      }
      } // end else quarterId
    } catch (e) {
      fail('crea carta di lavoro', e.message);
    }
  }

  // Crea bozza documento
  if (assignmentId) {
    try {
      const r = await post(`${GW}/api/drafts`, {
        assignment_id: assignmentId,
        title:         'Relazione (smoke test)',
        type:          'relazione_revisione',
        content:       'Bozza di test.',
      }, hdrs);
      if (r.status === 201 && r.body?.id) {
        ok(`crea bozza documento (id: ${r.body.id})`);
      } else {
        fail('crea bozza documento', `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      }
    } catch (e) {
      fail('crea bozza documento', e.message);
    }
  }

  return { companyId, assignmentId, workingPaperId };
}

// ---------------------------------------------------------------------------
// Test 5 — Isolamento multi-tenant
// ---------------------------------------------------------------------------
async function testMultiTenantIsolation(tokens, tenantAData) {
  section('5. Isolamento multi-tenant');

  if (!tokens.tenantB || !tenantAData.companyId) {
    fail('isolamento multi-tenant', 'Token o dati non disponibili — skip');
    return;
  }

  const hdrsB = auth(tokens.tenantB);

  // TenantB non deve vedere le aziende di TenantA
  try {
    const r = await get(`${GW}/api/companies`, hdrsB);
    if (r.status === 200 && Array.isArray(r.body)) {
      const leaked = r.body.some((c) => c.id === tenantAData.companyId);
      if (!leaked) {
        ok('TenantB non vede aziende di TenantA');
      } else {
        fail('TenantB NON deve vedere aziende di TenantA — LEAK RILEVATO!');
      }
    } else {
      fail('isolamento aziende', `HTTP ${r.status}`);
    }
  } catch (e) {
    fail('isolamento aziende', e.message);
  }

  // TenantB non deve accedere direttamente all'azienda di TenantA
  try {
    const r = await get(`${GW}/api/companies/${tenantAData.companyId}`, hdrsB);
    if (r.status === 404 || r.status === 403) {
      ok('TenantB riceve 404/403 su azienda di TenantA');
    } else if (r.status === 200) {
      fail(`LEAK: TenantB può leggere azienda di TenantA (id: ${tenantAData.companyId})`);
    } else {
      fail('isolamento accesso diretto azienda', `HTTP ${r.status}`);
    }
  } catch (e) {
    fail('isolamento accesso diretto azienda', e.message);
  }
}

// ---------------------------------------------------------------------------
// Test 6 — CORS preflight
// ---------------------------------------------------------------------------
async function testCors() {
  section('6. CORS preflight via gateway');

  try {
    const r = await request('OPTIONS', `${GW}/api/auth/login`, {
      headers: {
        Origin:                         'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    });
    if (r.status === 204 && r.headers['access-control-allow-origin']) {
      ok('OPTIONS preflight → 204 con Access-Control-Allow-Origin');
    } else {
      fail('CORS preflight', `HTTP ${r.status} — headers: ${JSON.stringify(r.headers)}`);
    }
  } catch (e) {
    fail('CORS preflight', e.message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\x1b[1m=== Smoke Test — revisionilegali microservizi ===\x1b[0m');
  console.log(`Gateway: ${GW}\n`);

  try {
    await testHealthGateway();
    await testHealthDirect();
    const tokens = await testAuth();
    const tenantAData = await testCrudFlow(tokens);
    await testMultiTenantIsolation(tokens, tenantAData);
    await testCors();
  } catch (e) {
    console.error('\n\x1b[31mErrore inatteso:\x1b[0m', e.message);
  }

  console.log(`\n\x1b[1mRisultato: ${passed} passed, ${failed} failed\x1b[0m`);
  if (failed > 0) process.exit(1);
}

main();
