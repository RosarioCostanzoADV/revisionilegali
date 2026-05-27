#!/usr/bin/env bash
# =============================================================================
# migrate_tenant.sh — Fase 3.3: Migrazione piani + tenant → tenant_db
# =============================================================================
# Sorgente:
#   data/plans.csv    (da public.plans)
#   data/tenants.csv  (da public.tenants)
#
# Target: tenant_db.plans, tenant_db.tenants
#
# Dipendenze FK: plans deve precedere tenants
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

TENANT_DB_URL="${TENANT_DB_URL:-postgresql://postgres:postgres@localhost:5434/tenant_db}"

echo "=================================================="
echo " migrate_tenant.sh — Migrazione → tenant_db"
echo "=================================================="

for f in plans.csv tenants.csv; do
  if [[ ! -f "$DATA_DIR/$f" ]]; then
    echo "❌  File non trovato: $DATA_DIR/$f"
    echo "    Esegui prima export_supabase.sh"
    exit 1
  fi
done

echo "⬆️   Caricamento plans.csv..."
psql "$TENANT_DB_URL" <<ENDSQL
DROP TABLE IF EXISTS _stg_plans;
CREATE TABLE _stg_plans (
  id                UUID,
  name              TEXT,
  max_assignments   INT,
  max_users         INT,
  storage_gb        INT,
  ai_quota          INT,
  vigilance_module  BOOLEAN,
  ai_drafts_module  BOOLEAN,
  advanced_import   BOOLEAN,
  is_active         BOOLEAN,
  created_at        TIMESTAMPTZ
);
ENDSQL

psql "$TENANT_DB_URL" -c "\copy _stg_plans FROM '$DATA_DIR/plans.csv' CSV HEADER"

echo "🔄  Inserimento piani..."
psql "$TENANT_DB_URL" <<'ENDSQL'
INSERT INTO plans (
  id, name, max_assignments, max_users, storage_gb, ai_quota,
  vigilance_module, ai_drafts_module, advanced_import, is_active, created_at, updated_at
)
SELECT
  id, name, max_assignments, max_users, storage_gb, ai_quota,
  vigilance_module, ai_drafts_module, advanced_import, is_active, created_at,
  COALESCE(created_at, now()) AS updated_at
FROM _stg_plans
ON CONFLICT (name) DO UPDATE SET
  max_assignments  = EXCLUDED.max_assignments,
  max_users        = EXCLUDED.max_users,
  storage_gb       = EXCLUDED.storage_gb,
  ai_quota         = EXCLUDED.ai_quota,
  vigilance_module = EXCLUDED.vigilance_module,
  ai_drafts_module = EXCLUDED.ai_drafts_module,
  advanced_import  = EXCLUDED.advanced_import,
  is_active        = EXCLUDED.is_active;
ENDSQL

echo "⬆️   Caricamento tenants.csv..."
psql "$TENANT_DB_URL" <<ENDSQL
DROP TABLE IF EXISTS _stg_tenants;
CREATE TABLE _stg_tenants (
  id                    UUID,
  name                  TEXT,
  referent_name         TEXT,
  phone                 TEXT,
  vat_number            TEXT,
  timezone              TEXT,
  logo_url              TEXT,
  status                TEXT,
  plan_id               UUID,
  plan_expires_at       TIMESTAMPTZ,
  onboarding_completed  BOOLEAN,
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ
);
ENDSQL

psql "$TENANT_DB_URL" -c "\copy _stg_tenants FROM '$DATA_DIR/tenants.csv' CSV HEADER"

echo "🔄  Inserimento tenant..."
psql "$TENANT_DB_URL" <<'ENDSQL'
INSERT INTO tenants (
  id, name, referent_name, phone, vat_number, timezone, logo_url,
  status, plan_id, plan_expires_at, onboarding_completed, created_at, updated_at
)
SELECT
  id, name, referent_name, phone, vat_number, timezone, logo_url,
  status, plan_id, plan_expires_at, onboarding_completed, created_at, updated_at
FROM _stg_tenants
ON CONFLICT (id) DO UPDATE SET
  name                 = EXCLUDED.name,
  referent_name        = EXCLUDED.referent_name,
  phone                = EXCLUDED.phone,
  vat_number           = EXCLUDED.vat_number,
  timezone             = EXCLUDED.timezone,
  logo_url             = EXCLUDED.logo_url,
  status               = EXCLUDED.status,
  plan_id              = EXCLUDED.plan_id,
  plan_expires_at      = EXCLUDED.plan_expires_at,
  onboarding_completed = EXCLUDED.onboarding_completed,
  updated_at           = EXCLUDED.updated_at;
ENDSQL

echo ""
echo "📊  Risultati migrazione tenant_db:"
psql "$TENANT_DB_URL" -c "SELECT COUNT(*) AS total_plans FROM plans;"
psql "$TENANT_DB_URL" -c "SELECT COUNT(*) AS total_tenants FROM tenants;"
psql "$TENANT_DB_URL" -c "SELECT status, COUNT(*) FROM tenants GROUP BY status ORDER BY status;"

echo ""
echo "✅  migrate_tenant.sh completato."
