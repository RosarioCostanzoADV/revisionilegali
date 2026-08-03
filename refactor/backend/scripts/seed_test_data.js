#!/usr/bin/env node
/**
 * seed_test_data.js — Seed dati di test per la validazione (Fase 4)
 *
 * Crea utenti e tenant nei microDB per eseguire smoke-test.js ed e2e-test.js.
 *
 * Prerequisiti:
 *   - docker compose up --build (tutti i container attivi)
 *   - npm install pg bcryptjs (oppure: node -e "require('pg')" già presente nel PATH)
 *
 * Esecuzione:
 *   node refactor/backend/scripts/seed_test_data.js
 *
 * Utenti creati:
 *   - admin@revisionilegali.it / Admin1234!   → super_admin (no tenant)
 *   - tenantA@test.it         / TenantA123!  → tenant_owner (tenant A)
 *   - tenantB@test.it         / TenantB123!  → tenant_owner (tenant B)
 *   - collab@test.it          / Collab123!   → collaborator (tenant A)
 *   - revisor@test.it         / Revisor123!  → revisor (tenant A)
 */

'use strict';

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// Configurazione connessioni
// ---------------------------------------------------------------------------
const AUTH_DB_URL    = process.env.AUTH_DB_URL    || 'postgresql://postgres:postgres@localhost:5433/auth_db';
const TENANT_DB_URL  = process.env.TENANT_DB_URL  || 'postgresql://postgres:postgres@localhost:5434/tenant_db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function connect(url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

function log(msg)  { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { console.warn(`  \x1b[33m⚠\x1b[0m ${msg}`); }
function err(msg)  { console.error(`  \x1b[31m✗\x1b[0m ${msg}`); }

// ---------------------------------------------------------------------------
// IDs fissi (riproducibili tra seed e test)
// ---------------------------------------------------------------------------
const IDS = {
  planSmall:   '00000000-0000-0000-0000-000000000001',
  planMedium:  '00000000-0000-0000-0000-000000000002',
  planGold:    '00000000-0000-0000-0000-000000000003',
  tenantA:     '10000000-0000-0000-0000-000000000001',
  tenantB:     '10000000-0000-0000-0000-000000000002',
  superAdmin:  '20000000-0000-0000-0000-000000000001',
  ownerA:      '20000000-0000-0000-0000-000000000002',
  ownerB:      '20000000-0000-0000-0000-000000000003',
  collab:      '20000000-0000-0000-0000-000000000004',
  revisor:     '20000000-0000-0000-0000-000000000005',
};

// ---------------------------------------------------------------------------
// Seed tenant_db: plans + tenants
// ---------------------------------------------------------------------------
async function seedTenantDb() {
  console.log('\n\x1b[36m▶ tenant_db\x1b[0m');
  const db = await connect(TENANT_DB_URL);

  try {
    // Plans
    await db.query(`
      INSERT INTO plans (id, name, max_assignments, max_users, storage_gb, ai_quota, vigilance_module, ai_drafts_module, advanced_import, created_at, updated_at)
      VALUES
        ($1, 'Small',  5,   3,   5,   100,  false, false, false, NOW(), NOW()),
        ($2, 'Medium', 25,  10,  25,  500,  true,  true,  false, NOW(), NOW()),
        ($3, 'Gold',   200, 50,  200, -1,   true,  true,  true,  NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, updated_at = NOW()
    `, [IDS.planSmall, IDS.planMedium, IDS.planGold]);
    log('piani Small/Medium/Gold');

    // Tenant A
    await db.query(`
      INSERT INTO tenants (id, name, plan_id, status, onboarding_completed, created_at, updated_at)
      VALUES ($1, 'Studio A (test)', $2, 'active', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW()
    `, [IDS.tenantA, IDS.planMedium]);
    log('tenant A');

    // Tenant B
    await db.query(`
      INSERT INTO tenants (id, name, plan_id, status, onboarding_completed, created_at, updated_at)
      VALUES ($1, 'Studio B (test)', $2, 'active', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW()
    `, [IDS.tenantB, IDS.planSmall]);
    log('tenant B');

  } finally {
    await db.end();
  }
}

// ---------------------------------------------------------------------------
// Seed auth_db: user_profiles
// ---------------------------------------------------------------------------
async function seedAuthDb() {
  console.log('\n\x1b[36m▶ auth_db\x1b[0m');
  const db = await connect(AUTH_DB_URL);

  const users = [
    {
      id:        IDS.superAdmin,
      email:     'admin@revisionilegali.it',
      password:  'Admin1234!',
      role:      'super_admin',
      full_name: 'Super Admin',
      tenant_id: null,
    },
    {
      id:        IDS.ownerA,
      email:     'tenantA@test.it',
      password:  'TenantA123!',
      role:      'tenant_owner',
      full_name: 'Owner Studio A',
      tenant_id: IDS.tenantA,
    },
    {
      id:        IDS.ownerB,
      email:     'tenantB@test.it',
      password:  'TenantB123!',
      role:      'tenant_owner',
      full_name: 'Owner Studio B',
      tenant_id: IDS.tenantB,
    },
    {
      id:        IDS.collab,
      email:     'collab@test.it',
      password:  'Collab123!',
      role:      'collaborator',
      full_name: 'Collaboratore A',
      tenant_id: IDS.tenantA,
    },
    {
      id:        IDS.revisor,
      email:     'revisor@test.it',
      password:  'Revisor123!',
      role:      'revisor',
      full_name: 'Revisore A',
      tenant_id: IDS.tenantA,
    },
  ];

  try {
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await db.query(`
        INSERT INTO user_profiles (id, email, password_hash, role, full_name, tenant_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
          SET email = EXCLUDED.email,
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role,
              full_name = EXCLUDED.full_name,
              tenant_id = EXCLUDED.tenant_id,
              updated_at = NOW()
      `, [u.id, u.email, hash, u.role, u.full_name, u.tenant_id]);
      log(`utente ${u.email} (${u.role})`);
    }
  } finally {
    await db.end();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\x1b[1m=== Seed dati di test — revisionilegali microservizi ===\x1b[0m');

  try {
    await seedTenantDb();
    await seedAuthDb();
    console.log('\n\x1b[1m\x1b[32mSeed completato.\x1b[0m\n');
    console.log('Credenziali test:');
    console.log('  admin@revisionilegali.it / Admin1234!   (super_admin)');
    console.log('  tenantA@test.it          / TenantA123!  (tenant_owner — tenant A)');
    console.log('  tenantB@test.it          / TenantB123!  (tenant_owner — tenant B)');
    console.log('  collab@test.it           / Collab123!   (collaborator — tenant A)');
    console.log('  revisor@test.it          / Revisor123!  (revisor — tenant A)');
  } catch (e) {
    console.error('\n\x1b[31mErrore durante il seed:\x1b[0m', e.message);
    console.error('Verifica che i container siano attivi: docker compose ps');
    process.exit(1);
  }
}

main();
