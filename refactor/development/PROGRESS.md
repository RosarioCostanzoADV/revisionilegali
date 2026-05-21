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
