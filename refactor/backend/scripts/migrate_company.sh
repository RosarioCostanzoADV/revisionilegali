#!/usr/bin/env bash
# =============================================================================
# migrate_company.sh — Fase 3.4: Migrazione aziende → company_db
# =============================================================================
# Sorgente: data/companies.csv (da public.companies — se esiste in Supabase)
# Target:   company_db.companies
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

COMPANY_DB_URL="${COMPANY_DB_URL:-postgresql://postgres:postgres@localhost:5435/company_db}"

echo "=================================================="
echo " migrate_company.sh — Migrazione → company_db"
echo "=================================================="

if [[ ! -f "$DATA_DIR/companies.csv" ]]; then
  echo "⚠️   $DATA_DIR/companies.csv non trovato. Nessuna azienda da migrare."
  echo "    (La tabella companies potrebbe non esistere in Supabase — è normale)"
  exit 0
fi

ROW_COUNT=$(( $(wc -l < "$DATA_DIR/companies.csv") - 1 ))
if [[ "$ROW_COUNT" -eq 0 ]]; then
  echo "ℹ️   companies.csv è vuoto. Nessuna riga da migrare."
  exit 0
fi

echo "⬆️   Caricamento $ROW_COUNT aziende..."
psql "$COMPANY_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_companies (
  id          UUID,
  tenant_id   UUID,
  name        VARCHAR(300),
  fiscal_code VARCHAR(20),
  vat_number  VARCHAR(20),
  sector      VARCHAR(100),
  address     VARCHAR(300),
  city        VARCHAR(100),
  province    VARCHAR(5),
  notes       TEXT,
  is_archived BOOLEAN,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
);
ENDSQL

psql "$COMPANY_DB_URL" -c "\copy _stg_companies FROM '$DATA_DIR/companies.csv' CSV HEADER"

echo "🔄  Inserimento in companies..."
psql "$COMPANY_DB_URL" <<'ENDSQL'
INSERT INTO companies (
  id, tenant_id, name, fiscal_code, vat_number, sector,
  address, city, province, notes, is_archived, created_at, updated_at
)
SELECT
  id, tenant_id, name, fiscal_code, vat_number, sector,
  address, city, province, notes, is_archived, created_at, updated_at
FROM _stg_companies
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  fiscal_code = EXCLUDED.fiscal_code,
  vat_number  = EXCLUDED.vat_number,
  sector      = EXCLUDED.sector,
  address     = EXCLUDED.address,
  city        = EXCLUDED.city,
  province    = EXCLUDED.province,
  notes       = EXCLUDED.notes,
  is_archived = EXCLUDED.is_archived,
  updated_at  = EXCLUDED.updated_at;
ENDSQL

echo ""
echo "📊  Risultati migrazione company_db:"
psql "$COMPANY_DB_URL" -c "SELECT COUNT(*) AS total_companies FROM companies;"
psql "$COMPANY_DB_URL" -c "SELECT is_archived, COUNT(*) FROM companies GROUP BY is_archived;"

echo ""
echo "✅  migrate_company.sh completato."
