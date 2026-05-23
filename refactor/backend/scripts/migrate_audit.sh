#!/usr/bin/env bash
# =============================================================================
# migrate_audit.sh — Fase 3.6: Migrazione audit → audit_db
# =============================================================================
# Sorgente:
#   data/working_papers.csv    (da public.working_papers)
#   data/findings.csv          (da public.findings)
#   data/vigilanza_items.csv   (da public.vigilanza_items)
#
# Target: audit_db.working_papers, findings, vigilanza_items
# Ordine FK: working_papers → findings
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

AUDIT_DB_URL="${AUDIT_DB_URL:-postgresql://postgres:postgres@localhost:5437/audit_db}"

echo "=================================================="
echo " migrate_audit.sh — Migrazione → audit_db"
echo "=================================================="

# ---------------------------------------------------------------------------
# working_papers
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/working_papers.csv" ]]; then
  echo "⚠️   working_papers.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/working_papers.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT working papers..."

  psql "$AUDIT_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_working_papers (
  id           UUID,
  tenant_id    UUID,
  quarter_id   UUID,
  title        VARCHAR(200),
  area         VARCHAR(50),
  content      TEXT,
  status       VARCHAR(20),
  prepared_by  UUID,
  reviewed_by  UUID,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ
);
ENDSQL

  psql "$AUDIT_DB_URL" -c "\copy _stg_working_papers FROM '$DATA_DIR/working_papers.csv' CSV HEADER"

  psql "$AUDIT_DB_URL" <<'ENDSQL'
INSERT INTO working_papers (
  id, tenant_id, quarter_id, title, area, content, status,
  prepared_by, reviewed_by, reviewed_at, created_at, updated_at
)
SELECT
  id, tenant_id, quarter_id, title, area, content, status,
  prepared_by, reviewed_by, reviewed_at, created_at, updated_at
FROM _stg_working_papers
ON CONFLICT (id) DO UPDATE SET
  title       = EXCLUDED.title,
  content     = EXCLUDED.content,
  status      = EXCLUDED.status,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = EXCLUDED.reviewed_at,
  updated_at  = EXCLUDED.updated_at;
ENDSQL
fi

# ---------------------------------------------------------------------------
# findings
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/findings.csv" ]]; then
  echo "⚠️   findings.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/findings.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT findings..."

  psql "$AUDIT_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_findings (
  id               UUID,
  tenant_id        UUID,
  quarter_id       UUID,
  working_paper_id UUID,
  title            VARCHAR(300),
  description      TEXT,
  recommendation   TEXT,
  severity         VARCHAR(20),
  status           VARCHAR(20),
  response         TEXT,
  due_date         DATE,
  closed_at        TIMESTAMPTZ,
  raised_by        UUID,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);
ENDSQL

  psql "$AUDIT_DB_URL" -c "\copy _stg_findings FROM '$DATA_DIR/findings.csv' CSV HEADER"

  psql "$AUDIT_DB_URL" <<'ENDSQL'
INSERT INTO findings (
  id, tenant_id, quarter_id, working_paper_id, title, description, recommendation,
  severity, status, response, due_date, closed_at, raised_by, created_at, updated_at
)
SELECT
  id, tenant_id, quarter_id, working_paper_id, title, description, recommendation,
  severity, status, response, due_date, closed_at, raised_by, created_at, updated_at
FROM _stg_findings
ON CONFLICT (id) DO UPDATE SET
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  recommendation = EXCLUDED.recommendation,
  severity       = EXCLUDED.severity,
  status         = EXCLUDED.status,
  response       = EXCLUDED.response,
  due_date       = EXCLUDED.due_date,
  closed_at      = EXCLUDED.closed_at,
  updated_at     = EXCLUDED.updated_at;
ENDSQL
fi

# ---------------------------------------------------------------------------
# vigilanza_items
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/vigilanza_items.csv" ]]; then
  echo "⚠️   vigilanza_items.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/vigilanza_items.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT voci vigilanza..."

  psql "$AUDIT_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_vigilanza_items (
  id           UUID,
  tenant_id    UUID,
  quarter_id   UUID,
  item         VARCHAR(500),
  category     VARCHAR(50),
  sort_order   INT,
  done         BOOLEAN,
  notes        TEXT,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ
);
ENDSQL

  psql "$AUDIT_DB_URL" -c "\copy _stg_vigilanza_items FROM '$DATA_DIR/vigilanza_items.csv' CSV HEADER"

  psql "$AUDIT_DB_URL" <<'ENDSQL'
INSERT INTO vigilanza_items (
  id, tenant_id, quarter_id, item, category, sort_order, done,
  notes, completed_by, completed_at, created_at, updated_at
)
SELECT
  id, tenant_id, quarter_id, item, category, sort_order, done,
  notes, completed_by, completed_at, created_at, updated_at
FROM _stg_vigilanza_items
ON CONFLICT (id) DO UPDATE SET
  item         = EXCLUDED.item,
  category     = EXCLUDED.category,
  sort_order   = EXCLUDED.sort_order,
  done         = EXCLUDED.done,
  notes        = EXCLUDED.notes,
  completed_by = EXCLUDED.completed_by,
  completed_at = EXCLUDED.completed_at,
  updated_at   = EXCLUDED.updated_at;
ENDSQL
fi

echo ""
echo "📊  Risultati migrazione audit_db:"
psql "$AUDIT_DB_URL" -c "SELECT COUNT(*) AS total_working_papers FROM working_papers;" 2>/dev/null || true
psql "$AUDIT_DB_URL" -c "SELECT COUNT(*) AS total_findings FROM findings;" 2>/dev/null || true
psql "$AUDIT_DB_URL" -c "SELECT COUNT(*) AS total_vigilanza FROM vigilanza_items;" 2>/dev/null || true

echo ""
echo "✅  migrate_audit.sh completato."
