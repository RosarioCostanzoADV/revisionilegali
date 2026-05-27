#!/usr/bin/env bash
# =============================================================================
# run_migrations.sh — Fase 3.9: Orchestratore migrazione completa
# =============================================================================
# Uso:
#   export SUPABASE_DB_URL="postgresql://..."
#   ./run_migrations.sh
#
# Le URL dei microservizi usano i default Docker (localhost:5433-5439).
# Sovrascrivile con env vars se necessario (vedi MIGRATION_NOTES.md).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colori output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() { echo -e "\n${BLUE}━━━ STEP $1: $2 ━━━${NC}"; }
log_ok()   { echo -e "${GREEN}✅  $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️   $1${NC}"; }
log_err()  { echo -e "${RED}❌  $1${NC}"; }

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Revisioni Legali — Migrazione Dati Supabase → μservizi ║"
echo "║   Fase 3 — run_migrations.sh                             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Data/ora: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ---------------------------------------------------------------------------
# Prerequisiti
# ---------------------------------------------------------------------------
if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  log_err "SUPABASE_DB_URL non impostata."
  echo "    Esempio: export SUPABASE_DB_URL='postgresql://postgres.<proj>:<pwd>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'"
  exit 1
fi

command -v psql >/dev/null 2>&1 || { log_err "psql non trovato."; exit 1; }

echo "Variabili DB microservizi (default Docker locale):"
echo "  AUTH_DB_URL       = ${AUTH_DB_URL:-postgresql://postgres:postgres@localhost:5433/auth_db}"
echo "  TENANT_DB_URL     = ${TENANT_DB_URL:-postgresql://postgres:postgres@localhost:5434/tenant_db}"
echo "  COMPANY_DB_URL    = ${COMPANY_DB_URL:-postgresql://postgres:postgres@localhost:5435/company_db}"
echo "  ASSIGNMENT_DB_URL = ${ASSIGNMENT_DB_URL:-postgresql://postgres:postgres@localhost:5436/assignment_db}"
echo "  AUDIT_DB_URL      = ${AUDIT_DB_URL:-postgresql://postgres:postgres@localhost:5437/audit_db}"
echo "  DOCUMENT_DB_URL   = ${DOCUMENT_DB_URL:-postgresql://postgres:postgres@localhost:5438/document_db}"
echo "  ACCOUNTING_DB_URL = ${ACCOUNTING_DB_URL:-postgresql://postgres:postgres@localhost:5439/accounting_db}"
echo ""

# Default URL se non impostate
export AUTH_DB_URL="${AUTH_DB_URL:-postgresql://postgres:postgres@localhost:5433/auth_db}"
export TENANT_DB_URL="${TENANT_DB_URL:-postgresql://postgres:postgres@localhost:5434/tenant_db}"
export COMPANY_DB_URL="${COMPANY_DB_URL:-postgresql://postgres:postgres@localhost:5435/company_db}"
export ASSIGNMENT_DB_URL="${ASSIGNMENT_DB_URL:-postgresql://postgres:postgres@localhost:5436/assignment_db}"
export AUDIT_DB_URL="${AUDIT_DB_URL:-postgresql://postgres:postgres@localhost:5437/audit_db}"
export DOCUMENT_DB_URL="${DOCUMENT_DB_URL:-postgresql://postgres:postgres@localhost:5438/document_db}"
export ACCOUNTING_DB_URL="${ACCOUNTING_DB_URL:-postgresql://postgres:postgres@localhost:5439/accounting_db}"

# Verifica connessioni DB microservizi
echo "Verifica connessioni DB microservizi..."
DBURLS=(
  "$AUTH_DB_URL:auth_db"
  "$TENANT_DB_URL:tenant_db"
  "$COMPANY_DB_URL:company_db"
  "$ASSIGNMENT_DB_URL:assignment_db"
  "$AUDIT_DB_URL:audit_db"
  "$DOCUMENT_DB_URL:document_db"
  "$ACCOUNTING_DB_URL:accounting_db"
)

ALL_OK=true
for entry in "${DBURLS[@]}"; do
  url="${entry%:*_db}"
  name="${entry##*:}"
  if psql "$url" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "  ✅ $name"
  else
    echo "  ❌ $name — impossibile connettersi a $url"
    ALL_OK=false
  fi
done

if [[ "$ALL_OK" == "false" ]]; then
  log_err "Alcune connessioni DB fallite. Assicurati che i container Docker siano attivi:"
  echo "    cd docker && docker compose up -d"
  exit 1
fi

echo ""

# ---------------------------------------------------------------------------
# Step 1 — Applica Sequelize migrations (crea schema se non esiste)
# ---------------------------------------------------------------------------
log_step 1 "Applicazione Sequelize migrations (schema DB)"
echo "Nota: se i DB sono già stati inizializzati, questo step è idempotente."

for svc in auth tenant company assignment audit document accounting; do
  SVC_DIR="$SCRIPT_DIR/../services/$svc"
  if [[ -d "$SVC_DIR" && -f "$SVC_DIR/package.json" ]]; then
    echo -n "  Migrazione schema $svc ... "
    if (cd "$SVC_DIR" && npx sequelize-cli db:migrate --env production 2>&1 | tail -1); then
      echo "  ✅"
    else
      log_warn "Migrazione schema $svc fallita (potrebbe essere già applicata)"
    fi
  else
    log_warn "Cartella servizio $svc non trovata: $SVC_DIR"
  fi
done

# ---------------------------------------------------------------------------
# Step 2 — Export Supabase → CSV
# ---------------------------------------------------------------------------
log_step 2 "Export dati Supabase → CSV"
bash "$SCRIPT_DIR/export_supabase.sh"
log_ok "Export completato"

# ---------------------------------------------------------------------------
# Step 3 — Migrazione per servizio (ordine: dipendenze FK)
# ---------------------------------------------------------------------------
log_step 3 "Migrazione auth (utenti)"
bash "$SCRIPT_DIR/migrate_auth.sh"

log_step 4 "Migrazione tenant (piani + tenant)"
bash "$SCRIPT_DIR/migrate_tenant.sh"

log_step 5 "Migrazione company (aziende)"
bash "$SCRIPT_DIR/migrate_company.sh"

log_step 6 "Migrazione assignment (incarichi + trimestri)"
bash "$SCRIPT_DIR/migrate_assignment.sh"

log_step 7 "Migrazione audit (working papers, findings, vigilanza)"
bash "$SCRIPT_DIR/migrate_audit.sh"

log_step 8 "Migrazione document (documenti + bozze)"
bash "$SCRIPT_DIR/migrate_document.sh"

log_step 9 "Migrazione accounting (import + voci contabili)"
bash "$SCRIPT_DIR/migrate_accounting.sh"

# ---------------------------------------------------------------------------
# Step 4 — Verifica finale
# ---------------------------------------------------------------------------
log_step 10 "Verifica conteggi"
bash "$SCRIPT_DIR/verify_migration.sh"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅  MIGRAZIONE COMPLETATA                              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Prossimi step:"
echo "  1. Verifica log sopra per eventuali avvisi"
echo "  2. Testa i microservizi: ./smoke-test.js"
echo "  3. Se ci sono utenti con password placeholder:"
echo "     → Invia email di reset a tutti gli utenti migrati"
echo ""
