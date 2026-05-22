# Progress Log — Refactoring Microservizi

> Log cronologico di esecuzione. Ogni entry descrive cosa è stato fatto, l'esito e le decisioni prese.  
> Aggiornare questo file ad ogni step significativo completato o a ogni problema rilevante incontrato.

---

## 2026-05-21 — Kickoff e Setup

### Fatto
- Letti e analizzati i documenti di contesto:
  - `refactor/analysis.md` — analisi funzionale completa
  - `refactor/architecture.md` — architettura tecnica attuale (Next.js 15 + Supabase)
  - `refactor/backend/roadmap.md` — piano architetturale microservizi
  - `refactor/backend/SKILLS.md` — pattern di implementazione
  - `refactor/backend/create_ms.py` — script scaffolding microservizi

- Creato branch `refactor/microservices-architecture` da `main`
- Creata cartella `refactor/development/` con struttura di tracking:
  - `README.md` — overview e navigazione
  - `PLAN.md` — piano operativo con checklist complete
  - `PROGRESS.md` — questo file
  - `ENVIRONMENT.md` — reference porte e variabili d'ambiente

### Decisioni prese
- Il branch `refactor/microservices-architecture` non verrà mergato in `main` fino al completamento della Fase 4 (Validazione).
- Tutti i microservizi useranno Node.js/Express seguendo i pattern in `SKILLS.md`.
- Le FK cross-service sono logiche (nessun vincolo DB fisico) — isolamento multi-tenant garantito a livello applicativo (`WHERE tenant_id = req.user.tenant_id`).
- L'`ai-service` è stateless — nessun DB dedicato.
- Il frontend Next.js verrà spostato in una sottocartella `frontend/` e privato di tutti i Route Handlers.

### Stato al termine della giornata
**Fase 0 — completata.**  
Prossimo step: Fase 1.0 — Infrastruttura Docker di base.

---

## 2026-05-21 — Fase 1.0 — Infrastruttura Docker di base

### Fatto
- Creato `docker/docker-compose.yml` con tutti i servizi: api-gateway (nginx), frontend, 8 microservizi + rispettivi DB PostgreSQL, ai-service (solo interno senza porta esposta). Rete `app_network`, volumi per tutti i DB.
- Creato `docker/nginx/nginx.conf` con routing path-based completo secondo ENVIRONMENT.md: `/api/auth/*`, `/api/tenants/*`, `/api/plans/*`, `/api/companies/*`, `/api/assignments/*`, `/api/audit/*`, `/api/documents/*`, `/api/drafts/*`, `/api/accounting/*` → servizi rispettivi. Frontend come fallback con supporto WebSocket per HMR.
- Creato `refactor/backend/services/template/` con 7 file:
  - `Dockerfile` — node:18-alpine, WORKDIR /app, CMD nodemon
  - `index.js` — express + cors + sequelize.authenticate + sync
  - `package.json` — dipendenze standard (express, sequelize, pg, jwt, cors, dotenv)
  - `config/config.js` — development/test/production con variabili d'ambiente
  - `middleware/auth.js` — JWT verify con `JWT_SECRET`
  - `models/index.js` — loader automatico Sequelize (non modificare)
  - `routes/index.js` — health check `/api/health` + slot per registrare routes
- Verificato `create_ms.py` con `python3 create_ms.py testverifica` — copia template, aggiorna package.json, stampa snippet docker-compose. Servizio di test rimosso.

### Decisioni prese
- `docker-compose.yml` usa `postgres:15-alpine` invece di `postgres:13` (più recente e sicura).
- Le porte container interne dei microservizi corrispondono alle porte host (3001→3001, etc.) per semplicità in sviluppo.
- `ai-service` usa `expose:` invece di `ports:` — non raggiungibile dall'host, solo dalla rete interna.
- `JWT_SECRET` e `INTERNAL_SERVICE_TOKEN` con default `change_me_in_production` per sicurezza esplicita.

### Prossimo step
Fase 1.1 — `auth-service`: scaffolding, modelli, migrazioni, implementazione login/JWT.

---

## 2026-05-22 — Fase 1.1 — `auth-service`

### Fatto
- Scaffoldato `services/auth/` tramite `create_ms.py auth`
- Aggiunto `bcryptjs` e `uuid` a `package.json`; dipendenze installate (`npm install`)
- Aggiornato `config/config.js` con database `auth_db` (dev/test)
- Aggiornato `middleware/auth.js`: aggiunta `requireAdmin` (tenant_owner + super_admin) e `requireSuperAdmin`
- Creati modelli Sequelize:
  - `models/UserProfile.js` — tabella `user_profiles` (UUID PK, email unique, password_hash, tenant_id, role, full_name, phone, signature_text, is_active)
  - `models/PasswordResetToken.js` — tabella `password_reset_tokens` (UUID PK, FK user_id, token_hash unique, expires_at, used_at)
- Creato `migrations/20260522000001-create-user-profiles.js`
- Creato `migrations/20260522000002-create-password-reset-tokens.js`
- Creati controller:
  - `controllers/authController.js` — login, logout, verify, getMe, updateMe, requestPasswordReset, updatePassword
  - `controllers/usersController.js` — listUsers, createUser, updateUser, deactivateUser (soft-delete)
- Creati file route:
  - `routes/authRoutes.js` — tutte le route pubbliche + protette dell'auth
  - `routes/usersRoutes.js` — CRUD utenti (richiede requireAdmin)
- Aggiornato `routes/index.js` per registrare `/auth` e `/auth/users`
- Aggiornato `index.js`: SERVICE_NAME default = `auth-service`
- docker-compose.yml già conteneva auth-service e auth_db dalla Fase 1.0 (nessuna modifica necessaria)
- Verifica sintassi JS: **tutti i file OK** (`node --check`)

### Problemi / Blocchi
- Docker daemon offline al momento del test: `docker compose up` non eseguibile. Test smoke (health check + login) da ri-eseguire quando Docker è attivo.

### Decisioni prese
- Reset password: token raw inviato via log in `NODE_ENV !== production`; email reale da implementare con un mail provider (prossima iterazione).
- Logout stateless: il client elimina il JWT. Blacklist con Redis pianificata come miglioramento futuro.
- Soft-delete per gli utenti (`is_active = false`) per preservare l'integrità referenziale.
- `token_hash` usa SHA-256 del token raw (mai salvare token raw in DB).

### Prossimo step
Fase 1.2 — `tenant-service`: scaffolding, modelli `Plan` + `Tenant`, CRUD piani/tenant, onboarding, `/api/tenants/:id/status`.

---

## 2026-05-22 — Fase 1.3 — `company-service`

### Fatto
- Scaffoldato `services/company/` tramite `create_ms.py company`
- Aggiornato `config/config.js` con database `company_db`
- Aggiornato `index.js`: SERVICE_NAME default = `company-service`
- Aggiornato `middleware/auth.js`: aggiunto controllo `tenant_id` obbligatorio nel JWT + `requireSuperAdmin`
- Creato modello Sequelize:
  - `models/Company.js` — tabella `companies` (UUID PK, tenant_id, name, fiscal_code, vat_number, sector, address, city, province, notes, is_archived, timestamps)
- Creato `migrations/20260522000001-create-companies.js` — tabella + indici su `tenant_id` e `(tenant_id, is_archived)`
- Creato controller:
  - `controllers/companiesController.js` — listCompanies (filtro archived), getCompany, createCompany, updateCompany (PATCH), archiveCompany (soft-delete via DELETE)
- Creati file route:
  - `routes/companiesRoutes.js` — GET / GET/:id / POST / PATCH/:id / DELETE/:id (tutti richiedono JWT)
  - `routes/index.js` — registrato `/companies`
- docker-compose.yml già conteneva company-service e company_db dalla Fase 1.0 (nessuna modifica necessaria)
- Verifica sintattica JS: **tutti i 9 file OK** (`node --check`)

### Decisioni prese
- Soft-delete tramite `is_archived = true` per preservare i riferimenti dagli incarichi.
- `DELETE /api/companies/:id` archivia (non distrugge): coerente con l'interfaccia Supabase esistente.
- `GET /api/companies` esclude le archiviate di default; `?archived=true` le include tutte.
- Solo `tenant_owner` e `revisor` possono creare/modificare/archiviare aziende.
- Tenant isolation garantito: ogni query include `WHERE tenant_id = req.user.tenant_id`.

### Problemi / Blocchi
- Docker daemon offline — smoke test da eseguire quando Docker è disponibile.

### Prossimo step
Fase 1.4 — `assignment-service`: scaffolding, modelli `Assignment` + `AssignmentMember` + `Quarter`, CRUD incarichi con auto-creazione 4 trimestri.

---

## 2026-05-22 — Fase 1.4 — `assignment-service`

### Fatto
- Scaffoldato `services/assignment/` tramite `create_ms.py assignment`
- Aggiornato `config/config.js` con database `assignment_db`
- Aggiornato `index.js`: SERVICE_NAME default = `assignment-service`
- Aggiornato `middleware/auth.js`: controllo `tenant_id` obbligatorio + `requireSuperAdmin`
- Creati modelli Sequelize:
  - `models/Assignment.js` — tabella `assignments` (UUID PK, tenant_id, company_id, year, type, status, notes, created_by)
  - `models/AssignmentMember.js` — tabella `assignment_members` (UUID PK, FK assignment_id CASCADE, user_id, role)
  - `models/Quarter.js` — tabella `quarters` (UUID PK, FK assignment_id CASCADE, tenant_id, quarter 1-4, status, notes, closed_at)
- Creati file di migrazione:
  - `migrations/20260522000001-create-assignments.js` — indici su tenant_id, (tenant_id, company_id), (tenant_id, year)
  - `migrations/20260522000002-create-assignment-members.js` — FK con CASCADE, unique (assignment_id, user_id)
  - `migrations/20260522000003-create-quarters.js` — FK con CASCADE, unique (assignment_id, quarter)
- Creati controller:
  - `controllers/assignmentsController.js` — listAssignments, getAssignment (con members+quarters inline), createAssignment (auto-crea 4 quarters + membri), updateAssignment (replace-all members), listQuarters
  - `controllers/quartersController.js` — getQuarter, updateQuarter (con gestione automatica closed_at)
- Creati file route:
  - `routes/assignmentsRoutes.js` — GET / POST / GET/:id / PATCH/:id / GET/:id/quarters
  - `routes/quartersRoutes.js` — GET/:id / PATCH/:id
  - `routes/index.js` — registrate `/assignments` e `/quarters`
- docker-compose.yml già conteneva assignment-service e assignment_db dalla Fase 1.0 (nessuna modifica necessaria)
- Verifica sintattica JS: **tutti i 15 file OK** (`node --check`)

### Decisioni prese
- `POST /api/assignments` usa `bulkCreate` transazionale per i 4 trimestri — atomico.
- `PATCH /api/assignments/:id` con `member_ids`: rimpiazza tutti i membri (delete + bulkCreate) come nel frontend originale.
- `Quarter.closed_at` viene impostato automaticamente quando `status = 'chiuso'`, azzerato altrimenti.
- `tenant_id` replicato in `quarters` per query dirette senza JOIN a `assignments`.

### Problemi / Blocchi
- Docker daemon offline — smoke test da eseguire quando Docker è disponibile.

### Prossimo step
Fase 1.5 — `audit-service`: scaffolding, modelli `WorkingPaper` + `Finding` + `VigilanzaItem`, CRUD carte di lavoro, rilievi e checklist vigilanza.

---

## 2026-05-22 — Fase 1.5 — `audit-service`

### Fatto
- Scaffoldato `services/audit/` tramite `create_ms.py audit`
- Aggiornato `config/config.js` con database `audit_db`
- Aggiornato `index.js`: SERVICE_NAME default = `audit-service`
- Aggiornato `middleware/auth.js`: controllo `tenant_id` obbligatorio nel JWT + `requireSuperAdmin`
- Creati modelli Sequelize:
  - `models/WorkingPaper.js` — tabella `working_papers` (UUID PK, tenant_id, quarter_id, title, area enum 11 valori, content TEXT, status bozza/in_revisione/approvata, prepared_by, reviewed_by, reviewed_at)
  - `models/Finding.js` — tabella `findings` (UUID PK, tenant_id, quarter_id, working_paper_id nullable FK, title, description, recommendation, severity bassa/media/alta/critica, status aperto/in_gestione/risolto/chiuso, response, due_date, closed_at, raised_by)
  - `models/VigilanzaItem.js` — tabella `vigilanza_items` (UUID PK, tenant_id, quarter_id, item 500, category, sort_order, done, notes, completed_by, completed_at)
- Creati file di migrazione:
  - `migrations/20260522000001-create-working-papers.js` — indici su tenant_id e quarter_id
  - `migrations/20260522000002-create-findings.js` — indici su tenant_id, quarter_id e working_paper_id; FK su working_papers con SET NULL
  - `migrations/20260522000003-create-vigilanza-items.js` — indici su tenant_id, quarter_id e (quarter_id, sort_order)
- Creati controller:
  - `controllers/workingPapersController.js` — CRUD con state machine: bozza→in_revisione→approvata; riapertura carta approvata solo con reopen_note; solo owner/revisor può approvare; on approvata: set reviewed_by + reviewed_at
  - `controllers/findingsController.js` — CRUD rilievi; closed_at auto su status='chiuso'; nullificato su altri stati
  - `controllers/vigilanzaController.js` — CRUD checklist; `load_template=true` carica 14 voci predefinite (409 se già esistono); done=true setta completed_by+completed_at automaticamente
- Creati file route:
  - `routes/workingPapersRoutes.js` — GET / POST / GET/:id / PATCH/:id
  - `routes/findingsRoutes.js` — GET / POST / GET/:id / PATCH/:id
  - `routes/vigilanzaRoutes.js` — GET / POST / PATCH/:id
  - `routes/index.js` — registrate `/working-papers`, `/findings`, `/vigilanza`
- docker-compose.yml già conteneva audit-service e audit_db dalla Fase 1.0 (nessuna modifica necessaria)
- Verifica sintattica JS: **tutti i 13 file OK** (`node --check`)

### Decisioni prese
- State machine per WorkingPaper: accesso granulare per ruolo (RBAC). Solo `tenant_owner`/`revisor` possono approvare o riaprire carte già approvate.
- `Finding.closed_at` auto-gestita lato server (non accettata dal client) per coerenza dati.
- Template vigilanza: 14 voci in 4 categorie (contabilità, governance, adempimenti, controllo_interno) — porta la logica da `app/(tenant)/incarichi/[id]/vigilanza/route.ts`.
- `VigilanzaItem.completed_by/at` auto-gestite lato server quando `done` cambia.

### Problemi / Blocchi
- Docker daemon offline — smoke test da eseguire quando Docker è disponibile.

### Prossimo step
Fase 1.6 — `document-service`: scaffolding, modelli `Document` + `Draft`, upload file con multer, CRUD documenti e bozze con template testo.

---

## 2026-05-22 — Fase 1.2 — `tenant-service`

### Fatto
- Scaffoldato `services/tenant/` tramite `create_ms.py tenant`
- Aggiunto `uuid` a `package.json`; dipendenze installate
- Aggiornato `config/config.js` (db: tenant_db), `middleware/auth.js` (+requireSuperAdmin), `index.js`
- Creati modelli Sequelize:
  - `models/Plan.js` — tabella `plans` (UUID PK, name unique, max_assignments, max_users, storage_gb, ai_quota, moduli booleani, is_active)
  - `models/Tenant.js` — tabella `tenants` (UUID PK, FK plan_id, status check, onboarding_completed)
- Creato `migrations/20260522000001-create-plans.js`
- Creato `migrations/20260522000002-create-tenants.js` (FK → plans con ON DELETE SET NULL)
- Creati controller:
  - `controllers/plansController.js` — listPlans (filtro is_active per non-admin), getPlan, createPlan, updatePlan
  - `controllers/tenantsController.js` — listTenants, getTenant, getTenantStatus, createTenant, updateTenant, completeOnboarding
- Creati file route:
  - `routes/plansRoutes.js` — GET aperto, POST/PUT solo super_admin
  - `routes/tenantsRoutes.js` — /:id/status accessibile a tutti gli autenticati; lista/crea solo super_admin
- Aggiornato `routes/index.js` per registrare `/plans` e `/tenants`
- docker-compose.yml già configurato dalla Fase 1.0
- Verifica sintassi JS: **tutti i file OK** (`node --check`)

### Decisioni prese
- `GET /api/tenants/:id/status` è accessibile a qualsiasi JWT valido (serve al middleware Next.js per verificare lo stato del tenant dell'utente loggato)
- `POST /api/tenants/onboarding` usa `tenant_id` dall'utente nel JWT (non da parametro URL) per evitare impersonation
- tenant_owner ha permessi di scrittura limitati: non può cambiare `status`, `plan_id` o `plan_expires_at`

### Prossimo step
Fase 1.3 — `company-service`: scaffolding, modello `Company`, CRUD aziende con filtro tenant_id, soft-delete.

---

<!-- Template per entry future:

## YYYY-MM-DD — <Titolo step>

### Fatto
- 

### Problemi / Blocchi
- 

### Decisioni prese
- 

### Prossimo step
- 

-->
