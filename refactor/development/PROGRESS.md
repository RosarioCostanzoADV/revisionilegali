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
