# Checklist Validazione — Fase 4

> **Prerequisiti**: `docker compose up --build` attivo, seed test data eseguito (`node refactor/backend/scripts/seed_test_data.js`)  
> **Legenda**: ⬜ non verificato · ✅ verificato · ❌ fallito

---

## 4.1 Equivalenza Funzionale (feature per feature)

Confronto tra comportamento atteso (monolite Supabase) e comportamento osservato (microservizi).

| # | Feature | Endpoint Microservizio | Equivalenza | Note |
|---|---------|------------------------|-------------|------|
| F01 | Login con email/password | `POST /api/auth/login` | ⬜ | Deve restituire JWT |
| F02 | Verifica JWT | `GET /api/auth/verify` | ⬜ | Usato da middleware Next.js |
| F03 | Profilo utente corrente | `GET /api/auth/me` | ⬜ | |
| F04 | Reset password (richiesta) | `POST /api/auth/forgot-password` | ⬜ | |
| F05 | Reset password (conferma) | `POST /api/auth/reset-password` | ⬜ | |
| F06 | Lista piani | `GET /api/plans` | ⬜ | Solo super_admin |
| F07 | Lista tenant | `GET /api/tenants` | ⬜ | Solo super_admin |
| F08 | Stato tenant | `GET /api/tenants/:id/status` | ⬜ | Usato da middleware Next.js |
| F09 | Onboarding tenant | `POST /api/tenants/onboarding` | ⬜ | |
| F10 | CRUD aziende | `GET/POST/PATCH/DELETE /api/companies` | ⬜ | Soft delete |
| F11 | Lista aziende con filtro | `GET /api/companies?archived=false` | ⬜ | |
| F12 | Crea incarico + 4 trimestri auto | `POST /api/assignments` | ⬜ | |
| F13 | Dettaglio incarico (con membri + quarters) | `GET /api/assignments/:id` | ⬜ | |
| F14 | Aggiorna stato incarico | `PATCH /api/assignments/:id` | ⬜ | |
| F15 | CRUD carte di lavoro | `GET/POST/PATCH /api/audit/working-papers` | ⬜ | State machine bozza→approvata |
| F16 | CRUD rilievi | `GET/POST/PATCH /api/audit/findings` | ⬜ | closed_at auto |
| F17 | Vigilanza init da template | `POST /api/audit/vigilanza/init` | ⬜ | 14 voci standard |
| F18 | Completa voce vigilanza | `PATCH /api/audit/vigilanza/:id` | ⬜ | |
| F19 | Upload documento | `POST /api/documents` (multipart) | ⬜ | Max 20 MB |
| F20 | Download documento | `GET /api/documents/:id/download` | ⬜ | |
| F21 | CRUD bozze + template | `GET/POST/PATCH /api/drafts` | ⬜ | Template auto-generato |
| F22 | Upload import contabile | `POST /api/accounting/imports` | ⬜ | Parse async 202 |
| F23 | Lista voci import | `GET /api/accounting/imports/:id/entries` | ⬜ | |
| F24 | CRUD utenti tenant | `GET/POST/PATCH/DELETE /api/auth/users` | ⬜ | Solo tenant_owner |
| F25 | Dashboard admin globale | `GET /api/admin/*` (via gateway) | ⬜ | Solo super_admin |

---

## 4.2 Flusso Onboarding

Scenario: nuovo tenant creato da super_admin → primo accesso → onboarding → dashboard

| Step | Azione | Atteso | Verificato |
|------|--------|--------|------------|
| 1 | `POST /api/auth/login` con nuovo tenant owner | 200 + JWT | ⬜ |
| 2 | `GET /api/tenants/:id/status` | `onboarding_completed: false` | ⬜ |
| 3 | Middleware Next.js reindirizza a `/onboarding` | redirect 302 | ⬜ |
| 4 | `POST /api/tenants/onboarding` con dati studio | 200 + tenant aggiornato | ⬜ |
| 5 | `GET /api/tenants/:id/status` dopo onboarding | `onboarding_completed: true` | ⬜ |
| 6 | Middleware Next.js permette accesso alla dashboard | dashboard 200 | ⬜ |

---

## 4.3 Flusso Incarico Completo

Scenario: azienda → incarico → trimestre → carta → rilievo → bozza → chiudi

| Step | Azione | Atteso | Verificato |
|------|--------|--------|------------|
| 1 | `POST /api/companies` | 201 + companyId | ⬜ |
| 2 | `POST /api/assignments` | 201 + assignmentId | ⬜ |
| 3 | `GET /api/assignments/:id/quarters` | array con 4 quarters | ⬜ |
| 4 | `POST /api/audit/working-papers` con quarter_id | 201 + wpId | ⬜ |
| 5 | `PATCH /api/audit/working-papers/:id` → stato `in_revisione` | 200 | ⬜ |
| 6 | `PATCH /api/audit/working-papers/:id` → stato `approvata` | 200 | ⬜ |
| 7 | `POST /api/audit/findings` con quarter_id | 201 + findingId | ⬜ |
| 8 | `PATCH /api/audit/findings/:id` → status `chiuso` | 200 + closed_at non null | ⬜ |
| 9 | `POST /api/drafts` con assignment_id + type | 201 + content template generato | ⬜ |
| 10 | `PATCH /api/drafts/:id` → status `definitivo` | 200 | ⬜ |
| 11 | `PATCH /api/assignments/:id` → status `chiuso` | 200 | ⬜ |

---

## 4.4 Flusso Import Contabile

Scenario: upload CSV → parsing → AI mapping → voci salvate

| Step | Azione | Atteso | Verificato |
|------|--------|--------|------------|
| 1 | `POST /api/accounting/imports` (multipart, CSV) | 202 + importId | ⬜ |
| 2 | `GET /api/accounting/imports/:id` (polling status) | status `completed` entro 30s | ⬜ |
| 3 | `GET /api/accounting/imports/:id/entries` | array voci con voce_bilancio non null | ⬜ |
| 4 | AI service raggiungibile via gateway | `GET /api/ai/health` → 200 | ⬜ |

---

## 4.5 Flusso Vigilanza

Scenario: init checklist da template → lista voci → completa → salva

| Step | Azione | Atteso | Verificato |
|------|--------|--------|------------|
| 1 | `POST /api/audit/vigilanza/init` con quarter_id | 201 + 14 voci create | ⬜ |
| 2 | `POST /api/audit/vigilanza/init` seconda volta (idempotenza) | 409 (già esistente) | ⬜ |
| 3 | `GET /api/audit/vigilanza?quarter_id=:id` | array con 14 items | ⬜ |
| 4 | `PATCH /api/audit/vigilanza/:id` → `done: true` | 200 + completed_by + completed_at non null | ⬜ |
| 5 | `PATCH /api/audit/vigilanza/:id` → `done: false` | 200 + completed_by null | ⬜ |

---

## 4.6 Area Admin

Scenario: super_admin login → lista tenant → crea tenant → modifica piano

| Step | Azione | Atteso | Verificato |
|------|--------|--------|------------|
| 1 | Login come super_admin | 200 + JWT con role=super_admin | ⬜ |
| 2 | `GET /api/tenants` con token super_admin | 200 + lista tutti i tenant | ⬜ |
| 3 | `GET /api/plans` con token super_admin | 200 + lista piani (Small/Medium/Gold) | ⬜ |
| 4 | `POST /api/tenants` con nome + email owner | 201 + tenantId | ⬜ |
| 5 | `PATCH /api/tenants/:id` → cambia plan_id | 200 + piano aggiornato | ⬜ |
| 6 | Tenant non-super_admin non può fare `GET /api/tenants` | 403 | ⬜ |

---

## 4.7 Sicurezza — Tenant Isolation

| Test | Scenario | Atteso | Verificato |
|------|----------|--------|------------|
| TI-01 | TenantB `GET /api/companies` | Lista vuota o solo aziende di B | ⬜ |
| TI-02 | TenantB `GET /api/companies/:id_di_A` | 403 o 404 | ⬜ |
| TI-03 | TenantB `GET /api/assignments/:id_di_A` | 403 o 404 | ⬜ |
| TI-04 | TenantB `GET /api/audit/working-papers?assignment_id=:id_di_A` | 403 o 404 | ⬜ |
| TI-05 | TenantB `GET /api/documents/:id_di_A` | 403 o 404 | ⬜ |
| TI-06 | TenantB `GET /api/accounting/imports?assignment_id=:id_di_A` | 403 o 404 | ⬜ |
| TI-07 | TenantB `PATCH /api/companies/:id_di_A` | 403 o 404 | ⬜ |
| TI-08 | TenantB `DELETE /api/companies/:id_di_A` | 403 o 404 | ⬜ |

---

## 4.8 Sicurezza — RBAC Ruoli

| Test | Scenario | Atteso | Verificato |
|------|----------|--------|------------|
| RB-01 | Collaborator `GET /api/companies` | 200 (lettura OK) | ⬜ |
| RB-02 | Collaborator `POST /api/companies` | 403 (solo owner/revisor) | ⬜ |
| RB-03 | Collaborator `DELETE /api/companies/:id` | 403 | ⬜ |
| RB-04 | Collaborator `POST /api/auth/users` (crea utente) | 403 | ⬜ |
| RB-05 | Collaborator `GET /api/tenants` | 403 | ⬜ |
| RB-06 | Revisor `PATCH /api/tenants/:id` | 403 | ⬜ |
| RB-07 | Revisor `POST /api/audit/working-papers` | 201 (permesso) | ⬜ |
| RB-08 | Revisor `PATCH /api/assignments/:id` → chiudi incarico | 403 (solo owner) | ⬜ |

---

## 4.9 Sicurezza — JWT

| Test | Scenario | Atteso | Verificato |
|------|----------|--------|------------|
| JWT-01 | Nessun token → `GET /api/companies` | 401 | ⬜ |
| JWT-02 | Token malformato (`Bearer invalid`) | 401 | ⬜ |
| JWT-03 | Token scaduto (exp nel passato) | 401 | ⬜ |
| JWT-04 | Token firmato con chiave sbagliata | 401 | ⬜ |
| JWT-05 | Token valido ma revocato (dopo logout/reset) | 401 o 403 | ⬜ |
| JWT-06 | Token inter-service (`X-Internal-Token`) senza JWT | 401 su endpoint pubblici | ⬜ |
| JWT-07 | Tutti i servizi restituiscono 401 senza token | auth/tenant/company/assignment/audit/document/accounting | ⬜ |

---

## 4.10 Approvazione Finale

| Condizione | Stato |
|------------|-------|
| Tutti i test 4.2–4.6 superati | ⬜ |
| Tutti i test TI-01–TI-08 superati | ⬜ |
| Tutti i test RB-01–RB-08 superati | ⬜ |
| Tutti i test JWT-01–JWT-07 superati | ⬜ |
| Nessun WARN nei log Docker durante i test | ⬜ |
| Branch `refactor/microservices-architecture` merge in `main` | ⬜ |

---

## Esecuzione automatizzata

```bash
# 1. Avvia lo stack
cd /path/to/revisionilegali
docker compose -f docker/docker-compose.yml up --build -d

# 2. Attendi che tutti i servizi siano healthy (30-60s)
docker compose -f docker/docker-compose.yml ps

# 3. Esegui il seed dei dati di test
node refactor/backend/scripts/seed_test_data.js

# 4. Esegui smoke test base
node refactor/backend/smoke-test.js

# 5. Esegui E2E completo (4.2-4.9)
node refactor/backend/e2e-test.js

# 6. Verifica output: tutti i test devono essere ✓
```
