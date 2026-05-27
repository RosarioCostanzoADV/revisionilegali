#!/usr/bin/env bash
# =============================================================================
# export_supabase.sh — Fase 3.1: Dump dati da Supabase a CSV
# =============================================================================
# Uso:
#   SUPABASE_DB_URL="postgresql://..." ./export_supabase.sh
#
# Output: file CSV nella cartella ./data/
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

# ---------------------------------------------------------------------------
# Validazione ambiente
# ---------------------------------------------------------------------------
if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "❌  Errore: variabile SUPABASE_DB_URL non impostata."
  echo "    Esempio: export SUPABASE_DB_URL='postgresql://postgres.<proj>:<pwd>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'"
  exit 1
fi

command -v psql >/dev/null 2>&1 || { echo "❌  psql non trovato. Installa postgresql-client."; exit 1; }

mkdir -p "$DATA_DIR"
echo "📂  Directory CSV: $DATA_DIR"
echo "🔗  Connessione Supabase: ${SUPABASE_DB_URL%%@*}@***"
echo ""

# ---------------------------------------------------------------------------
# Helper: esporta una tabella → CSV (salta se non esiste)
# ---------------------------------------------------------------------------
export_table() {
  local schema="$1"
  local table="$2"
  local columns="$3"
  local out_file="$DATA_DIR/${table}.csv"

  # Verifica se la tabella esiste prima di esportare
  local exists
  exists=$(psql "$SUPABASE_DB_URL" -t -c \
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$schema' AND table_name='$table');" \
    2>/dev/null | tr -d ' \n')

  if [[ "$exists" != "t" ]]; then
    echo "⚠️   Tabella $schema.$table non trovata — saltata."
    return 0
  fi

  echo -n "⬇️   Esportando $schema.$table ... "
  psql "$SUPABASE_DB_URL" -c "\copy (SELECT $columns FROM ${schema}.${table}) TO '$out_file' CSV HEADER"
  local count
  count=$(wc -l < "$out_file")
  count=$((count - 1))  # escludi header
  echo "✅  $count righe → ${table}.csv"
}

# ---------------------------------------------------------------------------
# Esportazioni
# ---------------------------------------------------------------------------

echo "=== Tabelle AUTH ==="

# auth.users — attenzione: richiede accesso diretto al schema auth di Supabase
# Se questo fallisce, esportare manualmente da Supabase Studio o usare la Admin API
AUTH_EXISTS=$(psql "$SUPABASE_DB_URL" -t -c \
  "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users');" \
  2>/dev/null | tr -d ' \n' || echo "f")

if [[ "$AUTH_EXISTS" == "t" ]]; then
  echo -n "⬇️   Esportando auth.users ... "
  psql "$SUPABASE_DB_URL" -c \
    "\copy (SELECT id, email, encrypted_password, created_at, updated_at FROM auth.users) TO '$DATA_DIR/auth_users.csv' CSV HEADER"
  COUNT=$(( $(wc -l < "$DATA_DIR/auth_users.csv") - 1 ))
  echo "✅  $COUNT righe → auth_users.csv"
else
  echo "⚠️   Schema auth.users non accessibile con questa connection string."
  echo "    ➡️  Opzione 1: usa una direct DB connection (non via pooler)."
  echo "    ➡️  Opzione 2: esporta manualmente da Supabase Studio → auth.users → Export CSV"
  echo "    ➡️  Salva come: $DATA_DIR/auth_users.csv (colonne: id,email,encrypted_password,created_at,updated_at)"
  echo ""
fi

export_table "public" "user_profiles" \
  "id, tenant_id, role, full_name, phone, signature_text, is_active, created_at, updated_at"

echo ""
echo "=== Tabelle TENANT ==="
export_table "public" "plans" \
  "id, name, max_assignments, max_users, storage_gb, ai_quota, vigilance_module, ai_drafts_module, advanced_import, is_active, created_at"
export_table "public" "tenants" \
  "id, name, referent_name, phone, vat_number, timezone, logo_url, status, plan_id, plan_expires_at, onboarding_completed, created_at, updated_at"

echo ""
echo "=== Tabelle COMPANY ==="
export_table "public" "companies" \
  "id, tenant_id, name, fiscal_code, vat_number, sector, address, city, province, notes, is_archived, created_at, updated_at"

echo ""
echo "=== Tabelle ASSIGNMENT ==="
export_table "public" "assignments" \
  "id, tenant_id, company_id, year, type, status, notes, created_by, created_at, updated_at"
export_table "public" "assignment_members" \
  "id, assignment_id, user_id, role, created_at"
export_table "public" "quarters" \
  "id, assignment_id, tenant_id, quarter, status, notes, closed_at, created_at, updated_at"

echo ""
echo "=== Tabelle AUDIT ==="
export_table "public" "working_papers" \
  "id, tenant_id, quarter_id, title, area, content, status, prepared_by, reviewed_by, reviewed_at, created_at, updated_at"
export_table "public" "findings" \
  "id, tenant_id, quarter_id, working_paper_id, title, description, recommendation, severity, status, response, due_date, closed_at, raised_by, created_at, updated_at"
export_table "public" "vigilanza_items" \
  "id, tenant_id, quarter_id, item, category, sort_order, done, notes, completed_by, completed_at, created_at, updated_at"

echo ""
echo "=== Tabelle DOCUMENT ==="
export_table "public" "documents" \
  "id, tenant_id, quarter_id, name, file_path, file_size, mime_type, category, notes, uploaded_by, created_at, updated_at"
export_table "public" "drafts" \
  "id, tenant_id, assignment_id, quarter_id, title, type, content, status, created_by, created_at, updated_at"

echo ""
echo "=== Tabelle ACCOUNTING ==="
export_table "public" "accounting_imports" \
  "id, tenant_id, assignment_id, quarter_id, file_name, file_type, status, entry_count, error_message, imported_by, created_at, updated_at"
export_table "public" "accounting_entries" \
  "id, tenant_id, import_id, account_code, account_name, balance, balance_prev, pdf_section, voce_standard, created_at, updated_at"

echo ""
echo "✅  Export completato. File CSV in: $DATA_DIR"
echo ""
echo "Prossimo step: ./run_migrations.sh"
