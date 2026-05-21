# Roadmap — Refactoring Backend in Microservizi

> **Stato:** pianificazione  
> **Data:** 2026-05-21  
> **Obiettivo:** estrarre il backend dall'attuale monolite Next.js e ridistribuirlo in microservizi indipendenti, ciascuno containerizzato con Docker e con il proprio database PostgreSQL.

---

## 1. Visione architetturale

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER / CLIENT                                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js — Docker container)                         │
│  Port: 3000                                                     │
│  - App Router, React Server Components, Tailwind                │
│  - Non ha più Route Handlers: tutte le chiamate API vanno       │
│    al gateway                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP interno
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  API GATEWAY  (nginx reverse proxy — Docker container)          │
│  Port: 8080 (interno) / 80-443 (esposto)                        │
│  - Routing path-based verso i microservizi                      │
│  - Centralizza CORS, rate-limiting, TLS termination             │
│  - /api/auth/*        → auth-service:3001                       │
│  - /api/tenants/*     → tenant-service:3002                     │
│  - /api/companies/*   → company-service:3003                    │
│  - /api/assignments/* → assignment-service:3004                 │
│  - /api/audit/*       → audit-service:3005                      │
│  - /api/documents/*   → document-service:3006                   │
│  - /api/accounting/*  → accounting-service:3007                 │
│  - /api/ai/*          → ai-service:3008  (interno, no auth pub) │
└─────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────────┘
      │      │      │      │      │      │      │
      ▼      ▼      ▼      ▼      ▼      ▼      ▼
  [auth] [tenant] [company] [assignment] [audit] [document] [accounting]
   :3001   :3002    :3003     :3004        :3005    :3006      :3007
                                                         ▲
                                                    [ai-service]
                                                       :3008
```

Ogni microservizio:
- è un container Docker Node.js/Express indipendente
- ha il proprio container PostgreSQL dedicato
- comunica con gli altri servizi tramite **HTTP interno** sulla stessa Docker network
- autentica le richieste in ingresso validando il **JWT** emesso da `auth-service`
- segue i pattern definiti in `SKILLS.md`

---

## 2. Microservizi — Panoramica

| # | Servizio | Porta app | Porta DB | Dominio di responsabilità |
|---|---|---|---|---|
| 1 | `auth-service` | 3001 | 5433 | Autenticazione, JWT, profili utente |
| 2 | `tenant-service` | 3002 | 5434 | Tenant, piani, onboarding, subscription |
| 3 | `company-service` | 3003 | 5435 | Aziende clienti per tenant |
| 4 | `assignment-service` | 3004 | 5436 | Incarichi, trimestri, team |
| 5 | `audit-service` | 3005 | 5437 | Carte di lavoro, rilievi, vigilanza |
| 6 | `document-service` | 3006 | 5438 | Documenti caricati, bozze ufficiali |
| 7 | `accounting-service` | 3007 | 5439 | Import contabili, voci, AI mapping |
| 8 | `ai-service` | 3008 | — | Integrazione Gemini (stateless, nessun DB) |
| — | `api-gateway` | 8080 | — | Reverse proxy nginx |
| — | `frontend` | 3000 | — | Next.js (solo rendering, no API interne) |

---

## 3. Dettaglio microservizi e tabelle DB

---

### 3.1 `auth-service`

**Responsabilità**
- Emissione e verifica dei JWT
- Login / logout / reset password
- Gestione profili utente (lettura e aggiornamento)
- Creazione utenti (solo da chiamate admin con service token)
- Verifica dello stato dell'account (is_active, ruolo)

**Note sull'autenticazione**  
Il sistema attuale usa Supabase Auth come identity provider. Nel refactoring, `auth-service` sostituisce Supabase Auth: gestisce hash delle password (bcrypt), emette JWT firmati con `JWT_SECRET` e li verifica. Tutti gli altri servizi validano il token chiamando `/api/auth/verify` oppure verificando il JWT in autonomia con la shared secret.

**Tabelle DB (`auth_db`)**

```sql
-- Profili utente (1:1 con l'utente autenticato)
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tenant_id     UUID,           -- NULL per super_admin
  role          TEXT NOT NULL DEFAULT 'collaborator'
                CHECK (role IN ('super_admin','tenant_owner','revisor','collaborator','syndic')),
  full_name     TEXT,
  phone         TEXT,
  signature_text TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Token di reset password (monouso, con scadenza)
CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**API principali**
```
POST   /api/auth/login               → { access_token, user }
POST   /api/auth/logout
POST   /api/auth/reset-password      → invia email con link
POST   /api/auth/update-password     → aggiorna password con token
GET    /api/auth/verify              → valida JWT, restituisce payload
GET    /api/auth/me                  → profilo utente corrente
PUT    /api/auth/me                  → aggiorna profilo (self)
GET    /api/auth/users               → lista utenti (admin)
POST   /api/auth/users               → crea utente (admin/tenant_owner)
PUT    /api/auth/users/:id           → modifica utente (admin)
DELETE /api/auth/users/:id           → disattiva utente (admin)
```

---

### 3.2 `tenant-service`

**Responsabilità**
- Gestione dei tenant (studi di revisione)
- Gestione dei piani di abbonamento
- Onboarding del tenant
- Verifica dello stato del tenant (active/suspended/trial)
- Cambio piano e scadenza (solo super_admin)

**Tabelle DB (`tenant_db`)**

```sql
-- Piani di abbonamento
CREATE TABLE plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL UNIQUE,
  max_assignments   INT NOT NULL,
  max_users         INT NOT NULL,
  storage_gb        INT NOT NULL,
  ai_quota          INT,            -- NULL = illimitata
  vigilance_module  BOOLEAN NOT NULL DEFAULT false,
  ai_drafts_module  BOOLEAN NOT NULL DEFAULT false,
  advanced_import   BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant (studi di revisione)
CREATE TABLE tenants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  referent_name        TEXT,
  phone                TEXT,
  vat_number           TEXT,
  timezone             TEXT NOT NULL DEFAULT 'Europe/Rome',
  logo_url             TEXT,
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','suspended','trial')),
  plan_id              UUID REFERENCES plans(id),
  plan_expires_at      TIMESTAMPTZ,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**API principali**
```
GET    /api/tenants                  → lista tenant (super_admin)
POST   /api/tenants                  → crea tenant (super_admin)
GET    /api/tenants/:id              → dettaglio tenant
PUT    /api/tenants/:id              → aggiorna tenant
GET    /api/tenants/:id/status       → stato tenant (per middleware frontend)
POST   /api/tenants/onboarding       → completa onboarding
GET    /api/plans                    → lista piani (autenticato)
POST   /api/plans                    → crea piano (super_admin)
PUT    /api/plans/:id                → aggiorna piano (super_admin)
```

---

### 3.3 `company-service`

**Responsabilità**
- CRUD delle aziende clienti per tenant
- Archiviazione soft (is_archived) senza cancellazione fisica
- Ricerca e filtraggio aziende

**Tabelle DB (`company_db`)**

```sql
CREATE TABLE companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,       -- FK logica verso tenant-service
  name         TEXT NOT NULL,
  tax_code     TEXT,               -- codice fiscale
  vat_number   TEXT,               -- partita IVA
  sector       TEXT,
  city         TEXT,
  province     TEXT,
  is_archived  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX companies_tenant_idx ON companies(tenant_id);
CREATE INDEX companies_archived_idx ON companies(tenant_id, is_archived);
```

**API principali**
```
GET    /api/companies                → lista aziende del tenant (con ?archived=true)
POST   /api/companies                → crea azienda
GET    /api/companies/:id            → dettaglio azienda
PUT    /api/companies/:id            → aggiorna azienda
DELETE /api/companies/:id            → archivio / cancella (soft delete)
```

---

### 3.4 `assignment-service`

**Responsabilità**
- CRUD degli incarichi di revisione
- Creazione automatica dei 4 trimestri all'apertura dell'incarico
- Gestione del team (assignment_members)
- Aggiornamento stato incarico (aperto → in_corso → chiuso)

**Tabelle DB (`assignment_db`)**

```sql
-- Incarichi di revisione
CREATE TABLE assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  company_id   UUID NOT NULL,       -- FK logica verso company-service
  type         TEXT NOT NULL
               CHECK (type IN ('revisione_legale','collegio_sindacale','sindaco_unico')),
  year         INT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'aperto'
               CHECK (status IN ('aperto','in_corso','chiuso')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, company_id, year, type)
);

-- Team incarico (M2M: utenti assegnati)
CREATE TABLE assignment_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,      -- FK logica verso auth-service
  role_in_assignment TEXT,          -- es. "lead_revisor", "collaborator"
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, user_id)
);

-- Trimestri (auto-creati: 4 per incarico)
CREATE TABLE quarters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  quarter_number INT NOT NULL CHECK (quarter_number BETWEEN 1 AND 4),
  label         TEXT NOT NULL,       -- es. "Q1 2025", "Q2 2025"
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, quarter_number)
);

CREATE INDEX assignments_tenant_idx ON assignments(tenant_id);
CREATE INDEX quarters_assignment_idx ON quarters(assignment_id);
```

**API principali**
```
GET    /api/assignments              → lista incarichi del tenant
POST   /api/assignments              → crea incarico (+ crea 4 quarters)
GET    /api/assignments/:id          → dettaglio incarico con quarters
PUT    /api/assignments/:id          → aggiorna incarico
DELETE /api/assignments/:id          → archivia incarico
GET    /api/assignments/:id/quarters → lista trimestri
GET    /api/assignments/:id/members  → team incarico
POST   /api/assignments/:id/members  → aggiungi membro
DELETE /api/assignments/:id/members/:userId → rimuovi membro
```

---

### 3.5 `audit-service`

**Responsabilità**
- Carte di lavoro per area di audit (per trimestre)
- Rilievi / anomalie (per trimestre, opzionalmente collegati a una carta)
- Checklist di vigilanza trimestrale (basata su template standard)

**Tabelle DB (`audit_db`)**

```sql
-- Carte di lavoro
CREATE TABLE working_papers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  quarter_id    UUID NOT NULL,       -- FK logica verso assignment-service
  assignment_id UUID NOT NULL,       -- denormalizzato per query efficiente
  area          TEXT NOT NULL
                CHECK (area IN (
                  'cassa_banche','crediti_clienti','debiti_fornitori',
                  'immobilizzazioni','rimanenze','patrimonio_netto',
                  'ricavi','costi','imposte','adempimenti','altro'
                )),
  title         TEXT NOT NULL,
  content       TEXT,
  status        TEXT NOT NULL DEFAULT 'in_revisione'
                CHECK (status IN ('in_revisione','completata')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rilievi
CREATE TABLE findings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  quarter_id       UUID NOT NULL,
  assignment_id    UUID NOT NULL,
  working_paper_id UUID,             -- FK logica opzionale
  title            TEXT NOT NULL,
  description      TEXT,
  recommendation   TEXT,
  severity         TEXT NOT NULL DEFAULT 'media'
                   CHECK (severity IN ('bassa','media','alta','critica')),
  status           TEXT NOT NULL DEFAULT 'aperto'
                   CHECK (status IN ('aperto','chiuso')),
  due_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist di vigilanza
CREATE TABLE vigilanza_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  quarter_id    UUID NOT NULL,
  assignment_id UUID NOT NULL,
  category      TEXT NOT NULL
                CHECK (category IN (
                  'contabilità','governance','adempimenti','controllo_interno'
                )),
  item_text     TEXT NOT NULL,
  is_checked    BOOLEAN NOT NULL DEFAULT false,
  notes         TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX working_papers_quarter_idx ON working_papers(quarter_id);
CREATE INDEX findings_quarter_idx ON findings(quarter_id);
CREATE INDEX vigilanza_quarter_idx ON vigilanza_items(quarter_id);
```

**API principali**
```
GET    /api/audit/working-papers?quarter_id=  → carte di lavoro del trimestre
POST   /api/audit/working-papers              → crea carta
GET    /api/audit/working-papers/:id          → dettaglio carta
PUT    /api/audit/working-papers/:id          → aggiorna carta
DELETE /api/audit/working-papers/:id

GET    /api/audit/findings?quarter_id=        → rilievi del trimestre
POST   /api/audit/findings
GET    /api/audit/findings/:id
PUT    /api/audit/findings/:id
DELETE /api/audit/findings/:id

GET    /api/audit/vigilanza?quarter_id=       → checklist trimestre
POST   /api/audit/vigilanza/init              → inizializza da template standard
PUT    /api/audit/vigilanza/:id               → aggiorna singolo item
```

---

### 3.6 `document-service`

**Responsabilità**
- Upload e download di documenti allegati (PDF, DOCX, immagini)
- CRUD delle bozze di documenti ufficiali con editor testuale
- Generazione del testo iniziale delle bozze da template predefiniti
- Gestione degli stati bozza → definitivo

**Tabelle DB (`document_db`)**

```sql
-- Documenti caricati (allegati)
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  assignment_id UUID,               -- opzionale
  quarter_id    UUID,               -- opzionale
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,      -- percorso nel volume / bucket S3
  mime_type     TEXT,
  size_bytes    BIGINT,
  uploaded_by   UUID NOT NULL,      -- FK logica verso auth-service
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bozze di documenti ufficiali
CREATE TABLE drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  assignment_id UUID NOT NULL,
  quarter_id    UUID,               -- opzionale (bozze trimestrali)
  type          TEXT NOT NULL
                CHECK (type IN (
                  'relazione_revisione','lettera_direzione',
                  'verbale_collegio','verbale_sindaco','altro'
                )),
  title         TEXT NOT NULL,
  content       TEXT,               -- testo HTML/Markdown dell'editor
  status        TEXT NOT NULL DEFAULT 'bozza'
                CHECK (status IN ('bozza','definitivo')),
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX documents_quarter_idx ON documents(quarter_id);
CREATE INDEX drafts_assignment_idx ON drafts(assignment_id);
```

**API principali**
```
GET    /api/documents?assignment_id=  → lista documenti
POST   /api/documents                 → upload file (multipart)
GET    /api/documents/:id/download    → download file
DELETE /api/documents/:id

GET    /api/drafts?assignment_id=     → lista bozze
POST   /api/drafts                    → crea bozza (con template auto-generato)
GET    /api/drafts/:id                → dettaglio bozza
PUT    /api/drafts/:id                → aggiorna contenuto
DELETE /api/drafts/:id
```

---

### 3.7 `accounting-service`

**Responsabilità**
- Upload e parsing di file contabili (CSV, XLSX, PDF)
- Orchestrazione del pipeline AI di mappatura civilistica
- Persistenza degli import e delle voci arricchite
- Esposizione delle voci contabili per le carte di lavoro

**Tabelle DB (`accounting_db`)**

```sql
-- Header degli import contabili
CREATE TABLE accounting_imports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  quarter_id    UUID NOT NULL,
  assignment_id UUID NOT NULL,
  filename      TEXT NOT NULL,
  doc_type      TEXT NOT NULL DEFAULT 'bilancio_verifica',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','completed','failed')),
  imported_by   UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voci contabili (arricchite dall'AI)
CREATE TABLE accounting_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  import_id         UUID NOT NULL REFERENCES accounting_imports(id) ON DELETE CASCADE,
  account_code      TEXT,
  account_name      TEXT NOT NULL,
  current_balance   NUMERIC(15,2),
  previous_balance  NUMERIC(15,2),
  voce_standard     TEXT,           -- es. "C.II.1 Crediti verso clienti"
  schema_civilistico TEXT,          -- SP_A | SP_P | CE | MEMO
  audit_area        TEXT,
  pdf_section       TEXT,           -- sezione rilevata dal layout PDF
  ai_mapped         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX accounting_imports_quarter_idx ON accounting_imports(quarter_id);
CREATE INDEX accounting_entries_import_idx ON accounting_entries(import_id);
```

**API principali**
```
POST   /api/accounting/imports        → step 1: upload file, parsing locale, restituisce entries preview
POST   /api/accounting/imports/save   → step 2: salva entries + innesca AI mapping
GET    /api/accounting/imports?quarter_id=
GET    /api/accounting/imports/:id
GET    /api/accounting/imports/:id/entries
DELETE /api/accounting/imports/:id
```

> **Nota:** il mapping AI è delegato internamente ad `ai-service` tramite chiamata HTTP interna. L'`accounting-service` non chiama direttamente l'SDK Gemini.

---

### 3.8 `ai-service`

**Responsabilità**
- Integrazione con Google Gemini SDK
- Esposizione di endpoint interni per:
  - Mappatura civilistica del bilancio di verifica
  - Generazione del testo iniziale delle bozze di documenti
- Gestione del budget token, fallback modelli, timeout

**Nessun DB dedicato** — il servizio è stateless.

**API interne** (non esposte al gateway pubblico)
```
POST   /internal/ai/map-bilancio     → input: array entries → output: array mapped entries
POST   /internal/ai/generate-draft   → input: { type, assignment_data } → output: { content: string }
```

**Configurazione**
```env
GEMINI_API_KEY=...
FIRST_ATTEMPT_TIMEOUT_MS=40000
TOTAL_BUDGET_MS=52000
MODELS=gemini-flash-latest,gemini-flash-lite-latest
```

---

## 4. Comunicazione inter-servizio

### 4.1 Autenticazione delle richieste in ingresso

Ogni richiesta proveniente dal frontend (via gateway) porta un `Authorization: Bearer <JWT>`. Ogni microservizio:

1. Estrae il token dall'header
2. Verifica la firma con `JWT_SECRET` (shared secret configurato come variabile d'ambiente in tutti i servizi)
3. Estrae `{ user_id, tenant_id, role }` dal payload JWT
4. Applica la propria logica di autorizzazione

Non è necessaria una chiamata network ad `auth-service` per ogni richiesta: la verifica JWT è locale e sincrona.

### 4.2 Chiamate inter-servizio

Le chiamate tra servizi (es. `accounting-service` → `ai-service`) avvengono via HTTP sulla rete Docker interna:

```
http://ai-service:3008/internal/ai/map-bilancio
```

Le chiamate inter-servizio usano un **service token** (JWT a lunga scadenza con `role: 'service'`) configurato come variabile d'ambiente. Il token viene verificato dal servizio destinatario come header standard.

```env
# In accounting-service
AI_SERVICE_URL=http://ai-service:3008
INTERNAL_SERVICE_TOKEN=...  # JWT firmato con JWT_SECRET, role: service
```

### 4.3 Referenze cross-service (FK logiche)

I microservizi non hanno FK fisiche verso DB di altri servizi. I campi come `tenant_id`, `company_id`, `quarter_id` sono **FK logiche** (UUID memorizzati senza vincolo referenziale). La consistenza viene garantita:

- **A livello applicativo**: il servizio chiamante verifica l'esistenza dell'entità via API prima di creare record dipendenti
- **A livello di business logic**: se una risorsa padre viene eliminata, il servizio proprietario propaga la cancellazione via eventi (in futuro) o API call (fase iniziale)

---

## 5. Configurazione Docker

### 5.1 Struttura cartelle Docker

```
docker/
  docker-compose.yml          ← orchestrazione completa
  nginx/
    nginx.conf                ← configurazione API gateway

services/
  template/                   ← template microservizio (vedere SKILLS.md)
  auth/
  tenant/
  company/
  assignment/
  audit/
  document/
  accounting/
  ai/

frontend/                     ← Next.js (rinominato da root)
```

### 5.2 Port mapping

| Servizio | Container port | Host port (dev) |
|---|---|---|
| frontend | 3000 | 3000 |
| api-gateway (nginx) | 80 | 8080 |
| auth-service | 3001 | 3001 |
| tenant-service | 3002 | 3002 |
| company-service | 3003 | 3003 |
| assignment-service | 3004 | 3004 |
| audit-service | 3005 | 3005 |
| document-service | 3006 | 3006 |
| accounting-service | 3007 | 3007 |
| ai-service | 3008 | 3008 |
| auth_db | 5432 | 5433 |
| tenant_db | 5432 | 5434 |
| company_db | 5432 | 5435 |
| assignment_db | 5432 | 5436 |
| audit_db | 5432 | 5437 |
| document_db | 5432 | 5438 |
| accounting_db | 5432 | 5439 |

### 5.3 Variabili d'ambiente condivise

```env
# Condivise tra TUTTI i microservizi
JWT_SECRET=<segreto forte, uguale in tutti>
NODE_ENV=development
```

---

## 6. Fasi di implementazione

### Fase 1 — Fondamenta (prerequisito per tutto il resto)

1. **Scaffolding Docker**: creare `docker/docker-compose.yml` con rete `app_network`, volumi per ogni DB, container nginx
2. **`auth-service`**: primo servizio da implementare — blocca o sblocca tutto il resto perché emette i JWT
3. **`tenant-service`**: secondo servizio — necessario per validare `tenant_id` negli altri servizi

### Fase 2 — Core operativo

4. **`company-service`**: semplice CRUD, dipende solo dall'auth
5. **`assignment-service`**: logica di business più complessa (creazione trimestri automatica)
6. **`audit-service`**: carte, rilievi, vigilanza — scrive sullo stesso `quarter_id` dell'assignment-service

### Fase 3 — Funzioni avanzate

7. **`document-service`**: upload file + template bozze (richiede configurazione storage volume/S3)
8. **`accounting-service`**: pipeline parsing file (richiede librerie xlsx/pdf lato Node.js)
9. **`ai-service`**: porta la logica da `lib/gemini/mapBilancio.ts` in un servizio Express standalone

### Fase 4 — Frontend

10. **Migrazione Next.js**: rimuovere tutti i Route Handlers (`app/api/**`), sostituire con chiamate fetch al gateway
11. **Aggiornamento middleware**: il middleware Next.js chiama `tenant-service` e `auth-service` per la macchina a stati di routing invece di Supabase direttamente

---

## 7. Mapping — API esistenti → Microservizio di destinazione

| Route Next.js attuale | Microservizio target |
|---|---|
| `app/api/me/` | `auth-service` |
| `app/api/auth/callback/` | `auth-service` |
| `app/api/tenant/profile/` | `auth-service` |
| `app/api/tenant/users/` | `auth-service` |
| `app/api/tenant/settings/` | `tenant-service` |
| `app/api/tenant/companies/` | `company-service` |
| `app/api/tenant/assignments/` | `assignment-service` |
| `app/api/tenant/quarters/` | `assignment-service` |
| `app/api/tenant/working-papers/` | `audit-service` |
| `app/api/tenant/findings/` | `audit-service` |
| `app/api/tenant/vigilanza/` | `audit-service` |
| `app/api/tenant/documents/` | `document-service` |
| `app/api/tenant/drafts/` | `document-service` |
| `app/api/tenant/accounting-imports/` | `accounting-service` |
| `app/api/admin/plans/` | `tenant-service` |
| `app/api/admin/tenants/` | `tenant-service` |
| `app/api/admin/users/` | `auth-service` |
| `app/api/tenants/onboarding/` | `tenant-service` |
| `app/api/tenants/status/` | `tenant-service` |

---

## 8. Note tecniche e decisioni architetturali

### 8.1 Supabase Auth → auth-service standalone
Il sistema attuale è completamente dipendente da Supabase Auth per l'identità. Nel refactoring, `auth-service` implementa auth autonoma (bcrypt + JWT firmati). Questo rimuove la dipendenza da un servizio esterno e rende l'intera piattaforma self-hosted.

### 8.2 Nessun RLS PostgreSQL nei nuovi DB
La Row Level Security era necessaria con Supabase perché le query potevano arrivare direttamente dal browser. Con i microservizi, ogni query al DB passa sempre attraverso il server Express che ha già verificato il JWT e estratto `tenant_id`. L'isolamento multi-tenant è quindi garantito a livello applicativo (clausola `WHERE tenant_id = req.user.tenant_id` in ogni query Sequelize).

### 8.3 Storage documenti
Il `document-service` gestirà i file tramite un volume Docker mappato in sviluppo. In produzione, il path sarà sostituito da un bucket S3-compatible (es. MinIO self-hosted o AWS S3). La logica di upload/download è astratta in un modulo `storage.js` interno al servizio per semplificare lo switch.

### 8.4 AI quota tracking
Il tracking della quota AI (attualmente non implementato) può essere aggiunto a `ai-service`: ogni invocazione registra i token utilizzati in una tabella interna e confronta il totale con il limite del piano (passato come parametro nella request dall'`accounting-service` o `document-service`).

### 8.5 Creazione script `create_ms.py`
Lo script `refactor/backend/create_ms.py` è già pronto per scaffoldare ogni microservizio. Va eseguito dalla cartella `refactor/backend/` dopo aver creato la cartella `services/` e il template in `services/template/`.
