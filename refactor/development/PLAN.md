# Piano Operativo — Refactoring Microservizi

> **Ultimo aggiornamento:** 2026-05-22  
> **Stato globale:** `IN CORSO — Fase 1.4 completata`  
> **Legenda:** ⬜ non iniziato · 🔄 in corso · ✅ completato · ❌ bloccato

---

## FASE 0 — Setup e Preparazione

| # | Task | Stato | Note |
|---|---|---|---|
| 0.1 | Creare branch `refactor/microservices-architecture` da `main` | ✅ | Branch attivo |
| 0.2 | Creare cartella `refactor/development` con hub di tracking | ✅ | Questo file |
| 0.3 | Leggere e comprendere `refactor/analysis.md` e `refactor/architecture.md` | ✅ | Completato in fase di planning |
| 0.4 | Leggere `refactor/backend/roadmap.md` e `SKILLS.md` | ✅ | Completato in fase di planning |

---

## FASE 1 — Backend Microservizi

### 1.0 Infrastruttura Docker di base

| # | Task | Stato | Note |
|---|---|---|---|
| 1.0.1 | Creare `docker/` con `docker-compose.yml` skeleton (rete, volumi) | ✅ | Tutti i servizi + db + nginx |
| 1.0.2 | Creare `docker/nginx/nginx.conf` con routing path-based verso i servizi | ✅ | Routing completo per tutti gli 8 servizi |
| 1.0.3 | Creare `services/template/` (template base microservizio) | ✅ | 7 file: Dockerfile, index.js, package.json, config/, middleware/, models/, routes/ |
| 1.0.4 | Verificare che `create_ms.py` funzioni correttamente | ✅ | Testato — copia template e aggiorna package.json correttamente | |

### 1.1 `auth-service` (porta 3001, db 5433)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.1.1 | Scaffoldare con `create_ms.py auth` | ✅ | |
| 1.1.2 | Creare modello `UserProfile` (`user_profiles`) | ✅ | Includi `password_hash`, ruoli |
| 1.1.3 | Creare modello `PasswordResetToken` (`password_reset_tokens`) | ✅ | |
| 1.1.4 | Creare migrazioni DB | ✅ | |
| 1.1.5 | Implementare login (bcrypt + JWT) | ✅ | `POST /api/auth/login` |
| 1.1.6 | Implementare verifica JWT (`GET /api/auth/verify`) | ✅ | Usato da tutti gli altri servizi |
| 1.1.7 | Implementare profilo utente (`GET/PUT /api/auth/me`) | ✅ | |
| 1.1.8 | Implementare reset password (email token) | ✅ | |
| 1.1.9 | Implementare CRUD utenti admin | ✅ | `GET/POST/PUT/DELETE /api/auth/users` |
| 1.1.10 | Aggiungere al `docker-compose.yml` (servizio + db) | ✅ | Già presente dal fase 1.0 |
| 1.1.11 | Test: `docker compose up auth-service` → `/api/health` risponde OK | ⬜ | Docker daemon offline — verifica sintassi JS: OK |
| 1.1.12 | Test: login con credenziali valide restituisce JWT valido | ⬜ | Richiede Docker attivo |

### 1.2 `tenant-service` (porta 3002, db 5434)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.2.1 | Scaffoldare con `create_ms.py tenant` | ✅ | |
| 1.2.2 | Creare modello `Plan` (`plans`) | ✅ | |
| 1.2.3 | Creare modello `Tenant` (`tenants`) | ✅ | |
| 1.2.4 | Creare migrazioni DB | ✅ | |
| 1.2.5 | Implementare CRUD piani (`/api/plans`) | ✅ | Solo super_admin può creare/modificare |
| 1.2.6 | Implementare CRUD tenant (`/api/tenants`) | ✅ | |
| 1.2.7 | Implementare `GET /api/tenants/:id/status` | ✅ | Usato dal middleware frontend |
| 1.2.8 | Implementare `POST /api/tenants/onboarding` | ✅ | |
| 1.2.9 | Aggiungere al `docker-compose.yml` | ✅ | Già presente dal fase 1.0 |
| 1.2.10 | Test: health check + CRUD tenant | ⬜ | Docker offline — sintassi JS: OK |

### 1.3 `company-service` (porta 3003, db 5435)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.3.1 | Scaffoldare con `create_ms.py company` | ✅ | |
| 1.3.2 | Creare modello `Company` (`companies`) | ✅ | UUID PK, tenant_id, campi anagrafici, is_archived |
| 1.3.3 | Creare migrazione DB | ✅ | Indici su tenant_id e tenant_id+is_archived |
| 1.3.4 | Implementare CRUD aziende (`/api/companies`) | ✅ | Filtro per `tenant_id` da JWT |
| 1.3.5 | Implementare soft-delete (archivio: `is_archived`) | ✅ | DELETE → imposta is_archived=true |
| 1.3.6 | Aggiungere al `docker-compose.yml` | ✅ | Già presente dal fase 1.0 |
| 1.3.7 | Test: health check + CRUD aziende | ⬜ | Docker offline — sintassi JS: OK |

### 1.4 `assignment-service` (porta 3004, db 5436)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.4.1 | Scaffoldare con `create_ms.py assignment` | ✅ | |
| 1.4.2 | Creare modello `Assignment` (`assignments`) | ✅ | tenant_id, company_id, year, type, status, notes, created_by |
| 1.4.3 | Creare modello `AssignmentMember` (`assignment_members`) | ✅ | CASCADE delete, unique (assignment_id, user_id) |
| 1.4.4 | Creare modello `Quarter` (`quarters`) | ✅ | tenant_id, quarter (1-4), status, closed_at |
| 1.4.5 | Creare migrazioni DB | ✅ | 3 file con indici e vincoli FK |
| 1.4.6 | Implementare `POST /api/assignments` con auto-creazione 4 trimestri | ✅ | bulkCreate quarters + members |
| 1.4.7 | Implementare CRUD incarichi e stati | ✅ | GET list, GET :id (con members+quarters), PATCH :id |
| 1.4.8 | Implementare gestione team (members) | ✅ | Replace-all su PATCH con member_ids |
| 1.4.9 | Implementare route trimestri | ✅ | GET /quarters/:id, PATCH /quarters/:id (con closed_at auto) |
| 1.4.10 | Aggiungere al `docker-compose.yml` | ✅ | Già presente dal fase 1.0 |
| 1.4.11 | Test: creazione incarico genera 4 quarter | ⬜ | Docker offline — sintassi JS: OK |

### 1.5 `audit-service` (porta 3005, db 5437)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.5.1 | Scaffoldare con `create_ms.py audit` | ⬜ | |
| 1.5.2 | Creare modello `WorkingPaper` (`working_papers`) | ⬜ | |
| 1.5.3 | Creare modello `Finding` (`findings`) | ⬜ | |
| 1.5.4 | Creare modello `VigilanzaItem` (`vigilanza_items`) | ⬜ | |
| 1.5.5 | Creare migrazioni DB | ⬜ | |
| 1.5.6 | Implementare CRUD carte di lavoro | ⬜ | |
| 1.5.7 | Implementare CRUD rilievi | ⬜ | |
| 1.5.8 | Implementare checklist vigilanza (init da template) | ⬜ | Template standard predefinito |
| 1.5.9 | Aggiungere al `docker-compose.yml` | ⬜ | |
| 1.5.10 | Test: health check + CRUD carte/rilievi | ⬜ | |

### 1.6 `document-service` (porta 3006, db 5438)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.6.1 | Scaffoldare con `create_ms.py document` | ⬜ | |
| 1.6.2 | Creare modello `Document` (`documents`) | ⬜ | |
| 1.6.3 | Creare modello `Draft` (`drafts`) | ⬜ | |
| 1.6.4 | Creare migrazioni DB | ⬜ | |
| 1.6.5 | Configurare `multer` per upload file su volume Docker | ⬜ | |
| 1.6.6 | Implementare upload/download documenti | ⬜ | |
| 1.6.7 | Implementare CRUD bozze con generazione template testo | ⬜ | Portare i template da Next.js |
| 1.6.8 | Aggiungere volume storage in `docker-compose.yml` | ⬜ | |
| 1.6.9 | Aggiungere al `docker-compose.yml` | ⬜ | |
| 1.6.10 | Test: upload file + download + CRUD bozze | ⬜ | |

### 1.7 `accounting-service` (porta 3007, db 5439)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.7.1 | Scaffoldare con `create_ms.py accounting` | ⬜ | |
| 1.7.2 | Creare modello `AccountingImport` (`accounting_imports`) | ⬜ | |
| 1.7.3 | Creare modello `AccountingEntry` (`accounting_entries`) | ⬜ | |
| 1.7.4 | Creare migrazioni DB | ⬜ | |
| 1.7.5 | Portare parser CSV/XLSX/PDF da `lib/accounting/parsers.ts` | ⬜ | Convertire da TS a JS |
| 1.7.6 | Implementare step 1: upload + parsing locale | ⬜ | |
| 1.7.7 | Implementare step 2: salvataggio + chiamata interna a `ai-service` | ⬜ | |
| 1.7.8 | Aggiungere al `docker-compose.yml` | ⬜ | |
| 1.7.9 | Test: upload CSV → entries parsed → chiamata AI → entries saved | ⬜ | |

### 1.8 `ai-service` (porta 3008, nessun DB)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.8.1 | Scaffoldare con `create_ms.py ai` | ⬜ | |
| 1.8.2 | Portare logica `lib/gemini/mapBilancio.ts` in JS | ⬜ | |
| 1.8.3 | Implementare `POST /internal/ai/map-bilancio` | ⬜ | Chiamata interna da accounting-service |
| 1.8.4 | Implementare `POST /internal/ai/generate-draft` | ⬜ | Chiamata interna da document-service |
| 1.8.5 | Implementare fallback modelli e timeout | ⬜ | flash-latest → flash-lite-latest |
| 1.8.6 | Aggiungere al `docker-compose.yml` (no DB) | ⬜ | |
| 1.8.7 | Test: chiamata map-bilancio con entries reali → output mappato corretto | ⬜ | |

### 1.9 API Gateway (nginx)

| # | Task | Stato | Note |
|---|---|---|---|
| 1.9.1 | Creare `docker/nginx/nginx.conf` con routing verso tutti i servizi | ⬜ | |
| 1.9.2 | Aggiungere nginx al `docker-compose.yml` | ⬜ | |
| 1.9.3 | Configurare CORS a livello gateway | ⬜ | |
| 1.9.4 | Test: tutte le route passano attraverso gateway verso servizi corretti | ⬜ | |

### 1.10 Smoke Test Backend Completo

| # | Task | Stato | Note |
|---|---|---|---|
| 1.10.1 | `docker compose up --build` → tutti i container partono | ⬜ | |
| 1.10.2 | Health check di ogni servizio tramite gateway | ⬜ | |
| 1.10.3 | Flusso completo: login → crea azienda → crea incarico → crea carta | ⬜ | Verifica JWT propagation |
| 1.10.4 | Verifica isolamento multi-tenant (tenant A non vede dati tenant B) | ⬜ | |

---

## FASE 2 — Frontend Refactor

| # | Task | Stato | Note |
|---|---|---|---|
| 2.1 | Creare `frontend/` copiando il codice Next.js attuale | ⬜ | Mantenere radice invariata fino a fine migrazione |
| 2.2 | Rimuovere tutti i Route Handlers (`app/api/**`) | ⬜ | Sostituiti dai microservizi |
| 2.3 | Creare `lib/api.ts` — client HTTP verso il gateway | ⬜ | Centralizza fetch + auth header |
| 2.4 | Aggiornare middleware Next.js: sostituire Supabase con chiamate a `auth-service` e `tenant-service` | ⬜ | |
| 2.5 | Sostituire `createClient()` Supabase nei Server Components con fetch al gateway | ⬜ | |
| 2.6 | Sostituire le chiamate nei Client Components Form con fetch al gateway | ⬜ | |
| 2.7 | Rimuovere le dipendenze Supabase dal `package.json` frontend | ⬜ | |
| 2.8 | Creare `Dockerfile` per il frontend | ⬜ | |
| 2.9 | Aggiungere frontend al `docker-compose.yml` | ⬜ | |
| 2.10 | Test: frontend parte in container e carica la homepage | ⬜ | |
| 2.11 | Test end-to-end login → dashboard → operazioni base | ⬜ | |

---

## FASE 3 — Migrazione Dati

| # | Task | Stato | Note |
|---|---|---|---|
| 3.1 | Creare script dump Supabase → SQL (tabella per tabella) | ⬜ | Usare `pg_dump` o Supabase CLI |
| 3.2 | Creare `scripts/migrate-auth.sql` (user_profiles → auth_db) | ⬜ | Attenzione: password in Supabase Auth non è bcrypt standard |
| 3.3 | Creare `scripts/migrate-tenant.sql` (plans, tenants → tenant_db) | ⬜ | |
| 3.4 | Creare `scripts/migrate-company.sql` (companies → company_db) | ⬜ | |
| 3.5 | Creare `scripts/migrate-assignment.sql` (assignments, quarters, members → assignment_db) | ⬜ | |
| 3.6 | Creare `scripts/migrate-audit.sql` (working_papers, findings, vigilanza → audit_db) | ⬜ | |
| 3.7 | Creare `scripts/migrate-document.sql` (documents, drafts → document_db) | ⬜ | |
| 3.8 | Creare `scripts/migrate-accounting.sql` (accounting_imports, entries → accounting_db) | ⬜ | |
| 3.9 | Eseguire migrazioni in ordine (auth → tenant → company → assignment → audit → document → accounting) | ⬜ | |
| 3.10 | Verifica integrità: contare record per ogni tabella e confrontare con Supabase | ⬜ | |
| 3.11 | Nota: gestire la migrazione delle password (Supabase usa bcrypt internamente — verificare compatibilità) | ⬜ | Potrebbe richiedere reset forzato password o workaround |

---

## FASE 4 — Validazione

| # | Task | Stato | Note |
|---|---|---|---|
| 4.1 | Definire checklist di equivalenza funzionale (feature per feature) | ⬜ | Basata su `analysis.md` §5 (flussi operativi) |
| 4.2 | Test: flusso onboarding (nuovo tenant → primo accesso → completa onboarding) | ⬜ | |
| 4.3 | Test: flusso incarico completo (crea azienda → incarico → trimestre → carta → rilievo → bozza) | ⬜ | |
| 4.4 | Test: import contabile (upload CSV → parsing → AI mapping → voci salvate) | ⬜ | |
| 4.5 | Test: vigilanza (init checklist da template → compila → salva) | ⬜ | |
| 4.6 | Test: area admin (super_admin login → crea tenant → modifica piano) | ⬜ | |
| 4.7 | Verifica sicurezza: tenant isolation (utente A non accede a dati tenant B) | ⬜ | |
| 4.8 | Verifica sicurezza: ruoli (collaborator non può fare azioni admin) | ⬜ | |
| 4.9 | Verifica sicurezza: JWT scaduto/invalido → 401 su tutti i servizi | ⬜ | |
| 4.10 | Approvazione finale: tutti i test verdi → merge in `main` | ⬜ | |

---

## Dipendenze tra fasi

```
Fase 0 (Setup)
  └─► Fase 1 (Backend)
        ├─ 1.0 (Docker infra)   → prerequisito per tutto §1
        ├─ 1.1 (auth)           → prerequisito per §1.2–1.9 (JWT)
        ├─ 1.2 (tenant)         → prerequisito per §1.3–1.9 (tenant_id)
        └─ 1.3–1.9 (altri ms)   → possono procedere in parallelo dopo 1.1+1.2
              └─► Fase 2 (Frontend)
                    └─► Fase 3 (Migrazione Dati)
                          └─► Fase 4 (Validazione)
                                └─► Merge in main
```
