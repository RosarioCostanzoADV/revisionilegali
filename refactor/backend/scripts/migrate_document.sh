#!/usr/bin/env bash
# =============================================================================
# migrate_document.sh — Fase 3.7: Migrazione documenti + bozze → document_db
# =============================================================================
# Sorgente:
#   data/documents.csv  (da public.documents)
#   data/drafts.csv     (da public.drafts)
#
# Target: document_db.documents, document_db.drafts
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

DOCUMENT_DB_URL="${DOCUMENT_DB_URL:-postgresql://postgres:postgres@localhost:5438/document_db}"

echo "=================================================="
echo " migrate_document.sh — Migrazione → document_db"
echo "=================================================="

# ---------------------------------------------------------------------------
# documents
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/documents.csv" ]]; then
  echo "⚠️   documents.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/documents.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT documenti..."

  psql "$DOCUMENT_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_documents (
  id          UUID,
  tenant_id   UUID,
  quarter_id  UUID,
  name        VARCHAR(300),
  file_path   VARCHAR(500),
  file_size   INT,
  mime_type   VARCHAR(100),
  category    VARCHAR(50),
  notes       TEXT,
  uploaded_by UUID,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
);
ENDSQL

  psql "$DOCUMENT_DB_URL" -c "\copy _stg_documents FROM '$DATA_DIR/documents.csv' CSV HEADER"

  psql "$DOCUMENT_DB_URL" <<'ENDSQL'
INSERT INTO documents (
  id, tenant_id, quarter_id, name, file_path, file_size, mime_type,
  category, notes, uploaded_by, created_at, updated_at
)
SELECT
  id, tenant_id, quarter_id, name, file_path, file_size, mime_type,
  category, notes, uploaded_by, created_at, updated_at
FROM _stg_documents
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  file_path  = EXCLUDED.file_path,
  category   = EXCLUDED.category,
  notes      = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;
ENDSQL
fi

# ---------------------------------------------------------------------------
# drafts
# ---------------------------------------------------------------------------
if [[ ! -f "$DATA_DIR/drafts.csv" ]]; then
  echo "⚠️   drafts.csv non trovato. Saltato."
else
  ROW_COUNT=$(( $(wc -l < "$DATA_DIR/drafts.csv") - 1 ))
  echo "⬆️   Caricamento $ROW_COUNT bozze..."

  psql "$DOCUMENT_DB_URL" <<ENDSQL
CREATE TEMP TABLE _stg_drafts (
  id            UUID,
  tenant_id     UUID,
  assignment_id UUID,
  quarter_id    UUID,
  title         VARCHAR(300),
  type          VARCHAR(50),
  content       TEXT,
  status        VARCHAR(20),
  created_by    UUID,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
);
ENDSQL

  psql "$DOCUMENT_DB_URL" -c "\copy _stg_drafts FROM '$DATA_DIR/drafts.csv' CSV HEADER"

  psql "$DOCUMENT_DB_URL" <<'ENDSQL'
INSERT INTO drafts (
  id, tenant_id, assignment_id, quarter_id, title, type,
  content, status, created_by, created_at, updated_at
)
SELECT
  id, tenant_id, assignment_id, quarter_id, title, type,
  content, status, created_by, created_at, updated_at
FROM _stg_drafts
ON CONFLICT (id) DO UPDATE SET
  title      = EXCLUDED.title,
  content    = EXCLUDED.content,
  status     = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
ENDSQL
fi

echo ""
echo "📊  Risultati migrazione document_db:"
psql "$DOCUMENT_DB_URL" -c "SELECT COUNT(*) AS total_documents FROM documents;" 2>/dev/null || true
psql "$DOCUMENT_DB_URL" -c "SELECT COUNT(*) AS total_drafts FROM drafts;" 2>/dev/null || true
psql "$DOCUMENT_DB_URL" -c "SELECT type, COUNT(*) FROM drafts GROUP BY type ORDER BY type;" 2>/dev/null || true

echo ""
echo "✅  migrate_document.sh completato."
