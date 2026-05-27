#!/usr/bin/env bash
# =============================================================================
# migrate_accounting.sh — Fase 3.8: Migrazione contabilità → accounting_db
# =============================================================================
# Sorgente:
#   data/accounting_imports.csv   (da public.accounting_imports)
#   data/accounting_entries.csv   (da public.accounting_entries)
#
# Target: accounting_db.accounting_imports, accounting_db.accounting_entries
# Ordine FK: accounting_imports → accounting_entries
#
# NOTE mapping colonne accounting_entries:
#   Supabase: voce_standard          → microservizio: voce_bilancio
#   Supabase: schema_civilistico     → microservizio: (non presente — ignorato)
#   Microservizio: voce_bilancio_code → NULL (non presente in Supabase)
#   Microservizio: mapped_at         → NULL (non presente in Supabase)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

ACCOUNTING_DB_URL="${ACCOUNTING_DB_URL:-postgresql://postgres:postgres@localhost:5439/accounting_db}"

echo "=================================================="
echo " migrate_accounting.sh — Migrazione → accounting_db"
echo "=================================================="

# ---------------------------------------------------------------------------
# accounting_imports
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/accounting_imports.csv" ]]; then
  echo "⚠️   accounting_imports.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/accounting_imports.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT import contabili..."

  psql "$ACCOUNTING_DB_URL" <<ENDSQL
DROP TABLE IF EXISTS _stg_accounting_imports;
CREATE TABLE _stg_accounting_imports (
  id            UUID,
  tenant_id     UUID,
  assignment_id UUID,
  quarter_id    UUID,
  file_name     VARCHAR(300),
  file_type     VARCHAR(20),
  status        TEXT,
  entry_count   INT,
  error_message TEXT,
  imported_by   UUID,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
);
ENDSQL

  psql "$ACCOUNTING_DB_URL" -c "\copy _stg_accounting_imports FROM '$DATA_DIR/accounting_imports.csv' CSV HEADER"

  psql "$ACCOUNTING_DB_URL" <<'ENDSQL'
INSERT INTO accounting_imports (
  id, tenant_id, assignment_id, quarter_id, file_name, file_type,
  status, entry_count, error_message, imported_by, created_at, updated_at
)
SELECT
  id, tenant_id, assignment_id, quarter_id, file_name, file_type,
  -- Normalizza status: valori validi per il microservizio
  CASE
    WHEN status IN ('pending','processing','completed','error') THEN status
    ELSE 'completed'
  END,
  COALESCE(entry_count, 0),
  error_message,
  imported_by,
  created_at,
  updated_at
FROM _stg_accounting_imports
ON CONFLICT (id) DO UPDATE SET
  status        = EXCLUDED.status,
  entry_count   = EXCLUDED.entry_count,
  error_message = EXCLUDED.error_message,
  updated_at    = EXCLUDED.updated_at;
ENDSQL
fi

# ---------------------------------------------------------------------------
# accounting_entries
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/accounting_entries.csv" ]]; then
  echo "⚠️   accounting_entries.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/accounting_entries.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT voci contabili..."

  psql "$ACCOUNTING_DB_URL" <<ENDSQL
DROP TABLE IF EXISTS _stg_accounting_entries;
CREATE TABLE _stg_accounting_entries (
  id             UUID,
  tenant_id      UUID,
  import_id      UUID,
  account_code   VARCHAR(50),
  account_name   VARCHAR(300),
  balance        NUMERIC(15,2),
  balance_prev   NUMERIC(15,2),
  pdf_section    VARCHAR(20),
  voce_standard  TEXT,         -- Supabase: voce_standard → microservizio: voce_bilancio
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
);
ENDSQL

  psql "$ACCOUNTING_DB_URL" -c "\copy _stg_accounting_entries FROM '$DATA_DIR/accounting_entries.csv' CSV HEADER"

  psql "$ACCOUNTING_DB_URL" <<'ENDSQL'
INSERT INTO accounting_entries (
  id, tenant_id, import_id, account_code, account_name,
  balance, balance_prev, pdf_section,
  voce_bilancio, voce_bilancio_code, mapped_at,
  created_at, updated_at
)
SELECT
  id, tenant_id, import_id, account_code, account_name,
  COALESCE(balance, 0), balance_prev, pdf_section,
  voce_standard,   -- mappato: voce_standard → voce_bilancio
  NULL,            -- voce_bilancio_code: non presente in Supabase
  CASE WHEN voce_standard IS NOT NULL THEN created_at ELSE NULL END,  -- mapped_at
  created_at,
  updated_at
FROM _stg_accounting_entries
ON CONFLICT (id) DO UPDATE SET
  account_name     = EXCLUDED.account_name,
  balance          = EXCLUDED.balance,
  balance_prev     = EXCLUDED.balance_prev,
  pdf_section      = EXCLUDED.pdf_section,
  voce_bilancio    = EXCLUDED.voce_bilancio,
  mapped_at        = EXCLUDED.mapped_at,
  updated_at       = EXCLUDED.updated_at;
ENDSQL
fi

echo ""
echo "📊  Risultati migrazione accounting_db:"
psql "$ACCOUNTING_DB_URL" -c "SELECT COUNT(*) AS total_imports FROM accounting_imports;" 2>/dev/null || true
psql "$ACCOUNTING_DB_URL" -c "SELECT COUNT(*) AS total_entries FROM accounting_entries;" 2>/dev/null || true
psql "$ACCOUNTING_DB_URL" -c "SELECT status, COUNT(*) FROM accounting_imports GROUP BY status ORDER BY status;" 2>/dev/null || true

echo ""
echo "✅  migrate_accounting.sh completato."
