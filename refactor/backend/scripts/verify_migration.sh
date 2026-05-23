#!/usr/bin/env bash
# =============================================================================
# verify_migration.sh — Fase 3.10: Verifica conteggi record migrati
# =============================================================================
# Confronta i conteggi tra Supabase (sorgente) e i DB microservizi (target).
# Eseguire DOPO run_migrations.sh.
# =============================================================================
set -euo pipefail

# Default URL microservizi
AUTH_DB_URL="${AUTH_DB_URL:-postgresql://postgres:postgres@localhost:5433/auth_db}"
TENANT_DB_URL="${TENANT_DB_URL:-postgresql://postgres:postgres@localhost:5434/tenant_db}"
COMPANY_DB_URL="${COMPANY_DB_URL:-postgresql://postgres:postgres@localhost:5435/company_db}"
ASSIGNMENT_DB_URL="${ASSIGNMENT_DB_URL:-postgresql://postgres:postgres@localhost:5436/assignment_db}"
AUDIT_DB_URL="${AUDIT_DB_URL:-postgresql://postgres:postgres@localhost:5437/audit_db}"
DOCUMENT_DB_URL="${DOCUMENT_DB_URL:-postgresql://postgres:postgres@localhost:5438/document_db}"
ACCOUNTING_DB_URL="${ACCOUNTING_DB_URL:-postgresql://postgres:postgres@localhost:5439/accounting_db}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0

# ---------------------------------------------------------------------------
# Helper: verifica conteggio tabella
# ---------------------------------------------------------------------------
check_table() {
  local label="$1"
  local db_url="$2"
  local table="$3"
  local csv_file="$4"   # opzionale: per confronto con sorgente

  # Conteggio nel microservizio DB
  local target_count
  target_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' \n' || echo "ERR")

  if [[ "$target_count" == "ERR" ]]; then
    echo -e "  ${RED}✗${NC}  $label → ERRORE connessione/tabella"
    FAIL=$((FAIL + 1))
    return
  fi

  # Confronto con CSV sorgente (se disponibile)
  if [[ -n "$csv_file" && -f "$DATA_DIR/$csv_file" ]]; then
    local src_count
    src_count=$(( $(wc -l < "$DATA_DIR/$csv_file") - 1 ))
    if [[ "$target_count" -eq "$src_count" ]]; then
      echo -e "  ${GREEN}✓${NC}  $label: $target_count/$src_count ✅"
      PASS=$((PASS + 1))
    elif [[ "$target_count" -gt 0 ]]; then
      echo -e "  ${YELLOW}~${NC}  $label: $target_count (target) / $src_count (sorgente) — parziale ⚠️"
      WARN=$((WARN + 1))
    else
      echo -e "  ${RED}✗${NC}  $label: 0 righe nel DB target (sorgente aveva $src_count) ❌"
      FAIL=$((FAIL + 1))
    fi
  else
    # Solo conteggio target
    if [[ "$target_count" -gt 0 ]]; then
      echo -e "  ${GREEN}✓${NC}  $label: $target_count righe"
      PASS=$((PASS + 1))
    else
      echo -e "  ${YELLOW}~${NC}  $label: 0 righe (nessun dato sorgente o tabella vuota)"
      WARN=$((WARN + 1))
    fi
  fi
}

# ---------------------------------------------------------------------------
# Verifica
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Verifica Migrazione — Conteggi Record               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

echo "── auth_db ─────────────────────────────────────────────────"
check_table "user_profiles"         "$AUTH_DB_URL"        "user_profiles"        "user_profiles.csv"

echo ""
echo "── tenant_db ───────────────────────────────────────────────"
check_table "plans"                 "$TENANT_DB_URL"      "plans"                "plans.csv"
check_table "tenants"               "$TENANT_DB_URL"      "tenants"              "tenants.csv"

echo ""
echo "── company_db ──────────────────────────────────────────────"
check_table "companies"             "$COMPANY_DB_URL"     "companies"            "companies.csv"

echo ""
echo "── assignment_db ───────────────────────────────────────────"
check_table "assignments"           "$ASSIGNMENT_DB_URL"  "assignments"          "assignments.csv"
check_table "assignment_members"    "$ASSIGNMENT_DB_URL"  "assignment_members"   "assignment_members.csv"
check_table "quarters"              "$ASSIGNMENT_DB_URL"  "quarters"             "quarters.csv"

echo ""
echo "── audit_db ────────────────────────────────────────────────"
check_table "working_papers"        "$AUDIT_DB_URL"       "working_papers"       "working_papers.csv"
check_table "findings"              "$AUDIT_DB_URL"       "findings"             "findings.csv"
check_table "vigilanza_items"       "$AUDIT_DB_URL"       "vigilanza_items"      "vigilanza_items.csv"

echo ""
echo "── document_db ─────────────────────────────────────────────"
check_table "documents"             "$DOCUMENT_DB_URL"    "documents"            "documents.csv"
check_table "drafts"                "$DOCUMENT_DB_URL"    "drafts"               "drafts.csv"

echo ""
echo "── accounting_db ───────────────────────────────────────────"
check_table "accounting_imports"    "$ACCOUNTING_DB_URL"  "accounting_imports"   "accounting_imports.csv"
check_table "accounting_entries"    "$ACCOUNTING_DB_URL"  "accounting_entries"   "accounting_entries.csv"

# ---------------------------------------------------------------------------
# Statistiche dettagliate
# ---------------------------------------------------------------------------
echo ""
echo "── Dettagli ────────────────────────────────────────────────"

echo ""
echo "auth_db — distribuzione ruoli:"
psql "$AUTH_DB_URL" -c \
  "SELECT role, COUNT(*) AS n, COUNT(*) FILTER (WHERE is_active) AS attivi FROM user_profiles GROUP BY role ORDER BY role;" \
  2>/dev/null || echo "  (dati non disponibili)"

echo ""
echo "tenant_db — stato tenant:"
psql "$TENANT_DB_URL" -c \
  "SELECT t.status, COUNT(*) AS n, p.name AS piano FROM tenants t LEFT JOIN plans p ON p.id=t.plan_id GROUP BY t.status, p.name ORDER BY t.status;" \
  2>/dev/null || echo "  (dati non disponibili)"

echo ""
echo "assignment_db — stato incarichi per anno:"
psql "$ASSIGNMENT_DB_URL" -c \
  "SELECT year, status, COUNT(*) FROM assignments GROUP BY year, status ORDER BY year DESC, status;" \
  2>/dev/null || echo "  (dati non disponibili)"

echo ""
echo "accounting_db — import per stato:"
psql "$ACCOUNTING_DB_URL" -c \
  "SELECT status, COUNT(*) AS import, SUM(entry_count) AS voci FROM accounting_imports GROUP BY status ORDER BY status;" \
  2>/dev/null || echo "  (dati non disponibili)"

# ---------------------------------------------------------------------------
# Sommario finale
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
printf "║   Sommario: ✅ %2d OK   ⚠️  %2d avvisi   ❌ %2d errori      ║\n" $PASS $WARN $FAIL
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo "❌  Ci sono $FAIL errori. Verificare i log sopra."
  exit 1
elif [[ "$WARN" -gt 0 ]]; then
  echo "⚠️   Migrazione completata con $WARN avvisi (conteggi parziali o tabelle vuote)."
  exit 0
else
  echo "✅  Tutti i conteggi corrispondono. Migrazione verificata con successo."
  exit 0
fi
