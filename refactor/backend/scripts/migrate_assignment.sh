#!/usr/bin/env bash
# =============================================================================
# migrate_assignment.sh — Fase 3.5: Migrazione incarichi → assignment_db
# =============================================================================
# Sorgente:
#   data/assignments.csv         (da public.assignments)
#   data/assignment_members.csv  (da public.assignment_members)
#   data/quarters.csv            (da public.quarters)
#
# Target: assignment_db.assignments, assignment_members, quarters
# Ordine FK: assignments → assignment_members, quarters
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

ASSIGNMENT_DB_URL="${ASSIGNMENT_DB_URL:-postgresql://postgres:postgres@localhost:5436/assignment_db}"

echo "=================================================="
echo " migrate_assignment.sh — Migrazione → assignment_db"
echo "=================================================="

# ---------------------------------------------------------------------------
# assignments
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/assignments.csv" ]]; then
  echo "⚠️   assignments.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/assignments.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT incarichi..."

  psql "$ASSIGNMENT_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_assignments (
  id         UUID,
  tenant_id  UUID,
  company_id UUID,
  year       INT,
  type       VARCHAR(50),
  status     VARCHAR(20),
  notes      TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
ENDSQL

  psql "$ASSIGNMENT_DB_URL" -c "\copy _stg_assignments FROM '$DATA_DIR/assignments.csv' CSV HEADER"

  psql "$ASSIGNMENT_DB_URL" <<'ENDSQL'
INSERT INTO assignments (
  id, tenant_id, company_id, year, type, status, notes, created_by, created_at, updated_at
)
SELECT
  id, tenant_id, company_id, year, type, status, notes, created_by, created_at, updated_at
FROM _stg_assignments
ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  notes      = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;
ENDSQL
fi

# ---------------------------------------------------------------------------
# assignment_members
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/assignment_members.csv" ]]; then
  echo "⚠️   assignment_members.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/assignment_members.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT membri incarico..."

  psql "$ASSIGNMENT_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_assignment_members (
  id            UUID,
  assignment_id UUID,
  user_id       UUID,
  role          VARCHAR(50),
  created_at    TIMESTAMPTZ
);
ENDSQL

  psql "$ASSIGNMENT_DB_URL" -c "\copy _stg_assignment_members FROM '$DATA_DIR/assignment_members.csv' CSV HEADER"

  psql "$ASSIGNMENT_DB_URL" <<'ENDSQL'
INSERT INTO assignment_members (id, assignment_id, user_id, role, created_at)
SELECT id, assignment_id, user_id, role, created_at
FROM _stg_assignment_members
ON CONFLICT (id) DO NOTHING;
ENDSQL
fi

# ---------------------------------------------------------------------------
# quarters
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/quarters.csv" ]]; then
  echo "⚠️   quarters.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/quarters.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT trimestri..."

  psql "$ASSIGNMENT_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_quarters (
  id            UUID,
  assignment_id UUID,
  tenant_id     UUID,
  quarter       INT,
  status        VARCHAR(20),
  notes         TEXT,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
);
ENDSQL

  psql "$ASSIGNMENT_DB_URL" -c "\copy _stg_quarters FROM '$DATA_DIR/quarters.csv' CSV HEADER"

  psql "$ASSIGNMENT_DB_URL" <<'ENDSQL'
INSERT INTO quarters (
  id, assignment_id, tenant_id, quarter, status, notes, closed_at, created_at, updated_at
)
SELECT
  id, assignment_id, tenant_id, quarter, status, notes, closed_at, created_at, updated_at
FROM _stg_quarters
ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  notes      = EXCLUDED.notes,
  closed_at  = EXCLUDED.closed_at,
  updated_at = EXCLUDED.updated_at;
ENDSQL
fi

echo ""
echo "📊  Risultati migrazione assignment_db:"
psql "$ASSIGNMENT_DB_URL" -c "SELECT COUNT(*) AS total_assignments FROM assignments;" 2>/dev/null || true
psql "$ASSIGNMENT_DB_URL" -c "SELECT COUNT(*) AS total_members FROM assignment_members;" 2>/dev/null || true
psql "$ASSIGNMENT_DB_URL" -c "SELECT COUNT(*) AS total_quarters FROM quarters;" 2>/dev/null || true

echo ""
echo "✅  migrate_assignment.sh completato."
