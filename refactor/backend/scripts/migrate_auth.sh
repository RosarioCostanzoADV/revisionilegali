#!/usr/bin/env bash
# =============================================================================
# migrate_auth.sh — Fase 3.2: Migrazione utenti → auth_db
# =============================================================================
# Sorgente:
#   data/auth_users.csv       (da auth.users — colonne: id,email,encrypted_password,created_at,updated_at)
#   data/user_profiles.csv    (da public.user_profiles)
#
# Target: auth_db.user_profiles
#
# Dipendenze FK: nessuna (auth_db è indipendente)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

AUTH_DB_URL="${AUTH_DB_URL:-postgresql://postgres:postgres@localhost:5433/auth_db}"

echo "=================================================="
echo " migrate_auth.sh — Migrazione → auth_db"
echo "=================================================="

# ---------------------------------------------------------------------------
# Prerequisiti
# ---------------------------------------------------------------------------
for f in user_profiles.csv; do
  if [[ ! -f "$DATA_DIR/$f" ]]; then
    echo "❌  File non trovato: $DATA_DIR/$f"
    echo "    Esegui prima export_supabase.sh"
    exit 1
  fi
done

if [[ ! -f "$DATA_DIR/auth_users.csv" ]]; then
  echo "⚠️   $DATA_DIR/auth_users.csv non trovato."
  echo "    Gli utenti saranno importati SENZA password hash."
  echo "    Dovranno reimpostare la password tramite reset."
  echo ""
  HAS_AUTH_USERS=false
else
  HAS_AUTH_USERS=true
fi

# ---------------------------------------------------------------------------
# Staging tables + migrazione
# ---------------------------------------------------------------------------
echo "🔄  Creazione tabelle staging..."

psql "$AUTH_DB_URL" <<'ENDSQL'
-- Pulizia staging precedente
DROP TABLE IF EXISTS _stg_auth_users;
DROP TABLE IF EXISTS _stg_user_profiles;

-- Staging: auth.users
CREATE TEMP TABLE _stg_auth_users (
  id                UUID,
  email             TEXT,
  encrypted_password TEXT,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
);

-- Staging: public.user_profiles
CREATE TEMP TABLE _stg_user_profiles (
  id             UUID,
  tenant_id      UUID,
  role           TEXT,
  full_name      TEXT,
  phone          TEXT,
  signature_text TEXT,
  is_active      BOOLEAN,
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
);
ENDSQL

echo "⬆️   Caricamento CSV in staging..."

psql "$AUTH_DB_URL" -c "\copy _stg_user_profiles (id,tenant_id,role,full_name,phone,signature_text,is_active,created_at,updated_at) FROM '$DATA_DIR/user_profiles.csv' CSV HEADER"

if [[ "$HAS_AUTH_USERS" == "true" ]]; then
  psql "$AUTH_DB_URL" -c "\copy _stg_auth_users (id,email,encrypted_password,created_at,updated_at) FROM '$DATA_DIR/auth_users.csv' CSV HEADER"
fi

echo "🔄  Inserimento in user_profiles..."

if [[ "$HAS_AUTH_USERS" == "true" ]]; then
  psql "$AUTH_DB_URL" <<'ENDSQL'
INSERT INTO user_profiles (
  id, email, password_hash,
  tenant_id, role, full_name, phone, signature_text, is_active,
  created_at, updated_at
)
SELECT
  up.id,
  COALESCE(au.email, 'unknown_' || up.id || '@migrated.local'),
  COALESCE(au.encrypted_password, '$2b$10$PLACEHOLDER_RESET_REQUIRED_xxxxxxxxxxxxxxxxxxxxxxxxx'),
  up.tenant_id,
  up.role,
  up.full_name,
  up.phone,
  up.signature_text,
  up.is_active,
  up.created_at,
  up.updated_at
FROM _stg_user_profiles up
LEFT JOIN _stg_auth_users au ON au.id = up.id
ON CONFLICT (id) DO UPDATE SET
  email          = EXCLUDED.email,
  password_hash  = EXCLUDED.password_hash,
  tenant_id      = EXCLUDED.tenant_id,
  role           = EXCLUDED.role,
  full_name      = EXCLUDED.full_name,
  phone          = EXCLUDED.phone,
  signature_text = EXCLUDED.signature_text,
  is_active      = EXCLUDED.is_active,
  updated_at     = EXCLUDED.updated_at;
ENDSQL
else
  # Senza hash password — inserisce con placeholder
  psql "$AUTH_DB_URL" <<'ENDSQL'
INSERT INTO user_profiles (
  id, email, password_hash,
  tenant_id, role, full_name, phone, signature_text, is_active,
  created_at, updated_at
)
SELECT
  up.id,
  'user_' || up.id || '@reset-required.local',
  '$2b$10$PLACEHOLDER_MUST_RESET_PASSWORD_xxxxxxxxxxxxxxxxxxxx',
  up.tenant_id,
  up.role,
  up.full_name,
  up.phone,
  up.signature_text,
  up.is_active,
  up.created_at,
  up.updated_at
FROM _stg_user_profiles up
ON CONFLICT (id) DO NOTHING;
ENDSQL
  echo "⚠️   Password impostate come placeholder. Gli utenti DEVONO fare reset password."
fi

# ---------------------------------------------------------------------------
# Report conteggi
# ---------------------------------------------------------------------------
echo ""
echo "📊  Risultati migrazione auth_db:"
psql "$AUTH_DB_URL" -c "SELECT COUNT(*) AS total_users FROM user_profiles;"
psql "$AUTH_DB_URL" -c "SELECT role, COUNT(*) FROM user_profiles GROUP BY role ORDER BY role;"

echo ""
echo "✅  migrate_auth.sh completato."
