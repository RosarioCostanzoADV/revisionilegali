# Fase 3 — Data Migration Notes

## Panoramica

Questo folder contiene gli script per migrare i dati dal database Supabase
(monolite) verso i database dei singoli microservizi.

## Architettura della migrazione

```
Supabase PostgreSQL
 ├── auth.users           → auth_db.user_profiles   (JOIN con public.user_profiles)
 ├── public.user_profiles → auth_db.user_profiles
 ├── public.plans         → tenant_db.plans
 ├── public.tenants       → tenant_db.tenants
 ├── public.companies     → company_db.companies
 ├── public.assignments   → assignment_db.assignments
 ├── public.assignment_members → assignment_db.assignment_members
 ├── public.quarters      → assignment_db.quarters
 ├── public.working_papers → audit_db.working_papers
 ├── public.findings      → audit_db.findings
 ├── public.vigilanza_items → audit_db.vigilanza_items
 ├── public.documents     → document_db.documents
 ├── public.drafts        → document_db.drafts
 ├── public.accounting_imports → accounting_db.accounting_imports
 └── public.accounting_entries → accounting_db.accounting_entries
```

## Prerequisiti

- `psql` installato in locale
- Docker con i microservizi attivi (`docker compose up -d`)
- Accesso al database Supabase (connection string)

## Variabili d'ambiente richieste

```bash
export SUPABASE_DB_URL="postgresql://postgres.<project>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# DB microservizi (default: Docker su localhost)
export AUTH_DB_URL="postgresql://postgres:postgres@localhost:5433/auth_db"
export TENANT_DB_URL="postgresql://postgres:postgres@localhost:5434/tenant_db"
export COMPANY_DB_URL="postgresql://postgres:postgres@localhost:5435/company_db"
export ASSIGNMENT_DB_URL="postgresql://postgres:postgres@localhost:5436/assignment_db"
export AUDIT_DB_URL="postgresql://postgres:postgres@localhost:5437/audit_db"
export DOCUMENT_DB_URL="postgresql://postgres:postgres@localhost:5438/document_db"
export ACCOUNTING_DB_URL="postgresql://postgres:postgres@localhost:5439/accounting_db"
```

## Ordine di esecuzione

```
1. export_supabase.sh      → esporta CSV da Supabase
2. migrate_auth.sh         → auth_db
3. migrate_tenant.sh       → tenant_db
4. migrate_company.sh      → company_db
5. migrate_assignment.sh   → assignment_db
6. migrate_audit.sh        → audit_db
7. migrate_document.sh     → document_db
8. migrate_accounting.sh   → accounting_db
9. verify_migration.sh     → confronta conteggi
```

Oppure esegui tutto con: `./run_migrations.sh`

## Note critiche

### ⚠️ Migrazione Password (CRITICA)

Supabase usa **bcrypt** per hashing delle password (`auth.users.encrypted_password`).
Il microservizio `auth-service` usa anch'esso **bcrypt** (`user_profiles.password_hash`).

La colonna `encrypted_password` in `auth.users` è DIRETTAMENTE compatibile
con `password_hash` in `auth_db.user_profiles`. Nessuna conversione necessaria.

**Accesso alla tabella `auth.users`**: Supabase di default blocca l'accesso diretto
alla tabella `auth.users` tramite la connection string standard. Esistono due approcci:

1. **Approccio diretto** (accesso via Supabase service_role o direct DB connection):
   ```bash
   psql "$SUPABASE_DB_URL" -c "\copy (SELECT id,email,encrypted_password FROM auth.users) TO '/tmp/auth_users.csv' CSV HEADER"
   ```

2. **Approccio alternativo** (se `auth` schema non è accessibile):
   - Usa la Supabase Admin API per esportare gli utenti
   - Oppure accedi tramite Supabase Studio → Table Editor → auth.users → Export
   - Salva come `data/auth_users.csv` con colonne: `id,email,encrypted_password`
   - Poi esegui solo `migrate_auth.sh`

3. **Reset password** (se non si riesce ad accedere agli hash):
   - Inserire utenti con password temporanea: `$2b$10$placeholder_hash_change_me`
   - Inviare email di reset a tutti gli utenti

### Tabelle non presenti nelle migrations Supabase

Le tabelle di dominio (`companies`, `assignments`, `quarters`, `working_papers`,
`findings`, `vigilanza_items`, `documents`, `drafts`, `accounting_imports`,
`accounting_entries`) non sono nelle migrations Supabase tracciate in questo repo.

Possono esistere nel database Supabase remoto (create via Studio), oppure essere
tabelle nuove create solo nei microservizi. Gli script gestiscono entrambi i casi:
se la tabella sorgente non esiste, lo script termina con un avviso senza errori.

### Mapping colonne accounting_entries

| Colonna Supabase          | Colonna microservizio     | Note |
|---------------------------|---------------------------|------|
| `voce_standard`           | `voce_bilancio`           | mappato |
| `schema_civilistico`      | — (non presente)          | ignorato |
| —                         | `voce_bilancio_code`      | NULL in migrazione |
| —                         | `mapped_at`               | NULL in migrazione |

### Colonna `doc_type` in accounting_imports

Supabase migration 0005 aggiunge `doc_type TEXT DEFAULT 'bilancio_verifica'`
alla tabella `accounting_imports`. Il modello Sequelize del microservizio non
include questa colonna. Aggiungere il campo al modello se necessario prima
di eseguire la migrazione, oppure ignorarla (default applicato).

## Struttura file CSV (output di export_supabase.sh)

```
data/
 ├── auth_users.csv
 ├── user_profiles.csv
 ├── plans.csv
 ├── tenants.csv
 ├── companies.csv          (se esiste in Supabase)
 ├── assignments.csv        (se esiste in Supabase)
 ├── assignment_members.csv (se esiste in Supabase)
 ├── quarters.csv           (se esiste in Supabase)
 ├── working_papers.csv     (se esiste in Supabase)
 ├── findings.csv           (se esiste in Supabase)
 ├── vigilanza_items.csv    (se esiste in Supabase)
 ├── documents.csv          (se esiste in Supabase)
 ├── drafts.csv             (se esiste in Supabase)
 ├── accounting_imports.csv (se esiste in Supabase)
 └── accounting_entries.csv (se esiste in Supabase)
```
