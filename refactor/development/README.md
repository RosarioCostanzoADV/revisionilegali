# Refactoring — Development Hub

> **Branch:** `refactor/microservices-architecture`  
> **Avvio:** 2026-05-21  
> **Obiettivo:** estrarre il backend dall'attuale monolite Next.js + Supabase e ridistribuirlo in microservizi containerizzati indipendenti, mantenendo parità funzionale con il sistema attuale.

---

## Navigazione dei documenti

| File | Scopo |
|---|---|
| [README.md](README.md) | Questo file — punto di ingresso e orientamento |
| [PLAN.md](PLAN.md) | Piano operativo completo con checklist per ogni fase e task |
| [PROGRESS.md](PROGRESS.md) | Log di esecuzione — esiti, decisioni, problemi e soluzioni |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Riferimento rapido: porte, variabili d'ambiente, URL servizi |

Documenti di contesto (cartella `refactor/`):

| File | Scopo |
|---|---|
| [../analysis.md](../analysis.md) | Analisi funzionale dell'applicazione attuale |
| [../architecture.md](../architecture.md) | Architettura tecnica attuale |
| [../backend/roadmap.md](../backend/roadmap.md) | Roadmap dettagliata dei microservizi backend |
| [../backend/SKILLS.md](../backend/SKILLS.md) | Pattern di implementazione da usare per ogni microservizio |
| [../backend/create_ms.py](../backend/create_ms.py) | Script Python per scaffoldare un nuovo microservizio |

---

## Struttura target del repository

Al termine del refactoring, il repository avrà questa struttura:

```
docker/
  docker-compose.yml          ← orchestrazione completa
  nginx/
    nginx.conf                ← API gateway

services/
  template/                   ← template microservizio base
  auth/                       ← auth-service (porta 3001, db 5433)
  tenant/                     ← tenant-service (porta 3002, db 5434)
  company/                    ← company-service (porta 3003, db 5435)
  assignment/                 ← assignment-service (porta 3004, db 5436)
  audit/                      ← audit-service (porta 3005, db 5437)
  document/                   ← document-service (porta 3006, db 5438)
  accounting/                 ← accounting-service (porta 3007, db 5439)
  ai/                         ← ai-service (porta 3008, nessun db)

frontend/                     ← Next.js refactorato (nessun Route Handler)

refactor/
  development/                ← questo hub (tracking e orchestrazione)
```

---

## Fasi del refactoring

```
Fase 0 — Setup
  └─ Branch git isolato ✓
  └─ Directory tracking (questo hub) ✓

Fase 1 — Backend Microservizi
  └─ Scaffolding Docker infrastruttura
  └─ auth-service + auth_db
  └─ tenant-service + tenant_db
  └─ company-service + company_db
  └─ assignment-service + assignment_db
  └─ audit-service + audit_db
  └─ document-service + document_db
  └─ accounting-service + accounting_db
  └─ ai-service (stateless)
  └─ API Gateway (nginx)
  └─ Smoke test: tutti i container up & healthy

Fase 2 — Frontend Refactor
  └─ Rimozione Route Handlers Next.js
  └─ Sostituzione chiamate Supabase con fetch al gateway
  └─ Aggiornamento middleware Next.js
  └─ Dockerfile frontend
  └─ Containerizzazione frontend

Fase 3 — Migrazione Dati
  └─ Dump Supabase → SQL
  └─ Script migrazione per ogni microservizio DB
  └─ Verifica integrità post-migrazione

Fase 4 — Validazione
  └─ Test funzionali end-to-end
  └─ Verifica parità frontend (smoke test UI)
  └─ Verifica sicurezza (JWT, isolamento tenant)
  └─ Approvazione finale → merge in main
```

Vedi [PLAN.md](PLAN.md) per il dettaglio completo con checklist.

---

## Regole operative

1. **Aggiornare PROGRESS.md** ad ogni step completato (esito, problemi, decisioni prese).
2. **Non mergare in `main`** finché la Fase 4 — Validazione non è completata e firmata.
3. **Usare SKILLS.md** come riferimento autoritativo per i pattern di implementazione dei microservizi.
4. **Usare `create_ms.py`** per scaffoldare ogni nuovo microservizio — non creare strutture manualmente.
5. Le FK logiche cross-service (es. `tenant_id`, `company_id`) **non hanno vincoli DB** — la consistenza è garantita a livello applicativo.
