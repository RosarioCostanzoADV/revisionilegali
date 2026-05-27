# Environment Reference — Porte, Servizi, Variabili

> Riferimento rapido per l'intera infrastruttura containerizzata.

---

## Porte dei servizi

| Servizio | Container port | Host port (dev) | Descrizione |
|---|---|---|---|
| `frontend` | 3000 | 3000 | Next.js App Router |
| `api-gateway` (nginx) | 80 | 8080 | Reverse proxy — ingresso pubblico |
| `auth-service` | 3001 | 3001 | Autenticazione, JWT, profili utente |
| `tenant-service` | 3002 | 3002 | Tenant, piani, onboarding |
| `company-service` | 3003 | 3003 | Aziende clienti |
| `assignment-service` | 3004 | 3004 | Incarichi, trimestri, team |
| `audit-service` | 3005 | 3005 | Carte di lavoro, rilievi, vigilanza |
| `document-service` | 3006 | 3006 | Documenti, bozze |
| `accounting-service` | 3007 | 3007 | Import contabili, AI mapping |
| `ai-service` | 3008 | 3008 | Gemini — solo interno, non esposto |

---

## Porte dei database

| DB | Container port | Host port (dev) | Usato da |
|---|---|---|---|
| `auth_db` | 5432 | 5433 | `auth-service` |
| `tenant_db` | 5432 | 5434 | `tenant-service` |
| `company_db` | 5432 | 5435 | `company-service` |
| `assignment_db` | 5432 | 5436 | `assignment-service` |
| `audit_db` | 5432 | 5437 | `audit-service` |
| `document_db` | 5432 | 5438 | `document-service` |
| `accounting_db` | 5432 | 5439 | `accounting-service` |

---

## URL interni (Docker network `app_network`)

| Da → A | URL |
|---|---|
| Frontend → Gateway | `http://api-gateway:80` |
| Qualsiasi servizio → auth | `http://auth-service:3001` |
| Qualsiasi servizio → tenant | `http://tenant-service:3002` |
| accounting-service → ai-service | `http://ai-service:3008` |
| document-service → ai-service | `http://ai-service:3008` |

---

## Routing API Gateway

| Path prefix | Destinazione |
|---|---|
| `/api/auth/*` | `http://auth-service:3001` |
| `/api/tenants/*` | `http://tenant-service:3002` |
| `/api/plans/*` | `http://tenant-service:3002` |
| `/api/companies/*` | `http://company-service:3003` |
| `/api/assignments/*` | `http://assignment-service:3004` |
| `/api/audit/*` | `http://audit-service:3005` |
| `/api/documents/*` | `http://document-service:3006` |
| `/api/drafts/*` | `http://document-service:3006` |
| `/api/accounting/*` | `http://accounting-service:3007` |

> `ai-service` **non è esposto** attraverso il gateway — risponde solo a chiamate interne da altri servizi.

---

## Variabili d'ambiente

### Variabili condivise (tutti i microservizi)

```env
JWT_SECRET=<segreto_forte_uguale_in_tutti_i_servizi>
NODE_ENV=development
```

### `auth-service`

```env
PORT=3001
DB_HOST=auth_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=auth_db
DB_PORT=5432
JWT_SECRET=<shared>
JWT_EXPIRES_IN=7d
SERVICE_TOKEN_EXPIRES_IN=365d
EMAIL_FROM=noreply@revisionilegali.it
SMTP_HOST=<smtp_host>
SMTP_PORT=587
SMTP_USER=<smtp_user>
SMTP_PASS=<smtp_pass>
```

### `tenant-service`

```env
PORT=3002
DB_HOST=tenant_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tenant_db
DB_PORT=5432
JWT_SECRET=<shared>
AUTH_SERVICE_URL=http://auth-service:3001
INTERNAL_SERVICE_TOKEN=<jwt_firmato_role_service>
```

### `company-service`

```env
PORT=3003
DB_HOST=company_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=company_db
DB_PORT=5432
JWT_SECRET=<shared>
```

### `assignment-service`

```env
PORT=3004
DB_HOST=assignment_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=assignment_db
DB_PORT=5432
JWT_SECRET=<shared>
```

### `audit-service`

```env
PORT=3005
DB_HOST=audit_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=audit_db
DB_PORT=5432
JWT_SECRET=<shared>
```

### `document-service`

```env
PORT=3006
DB_HOST=document_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=document_db
DB_PORT=5432
JWT_SECRET=<shared>
STORAGE_PATH=/app/storage
AI_SERVICE_URL=http://ai-service:3008
INTERNAL_SERVICE_TOKEN=<jwt_firmato_role_service>
```

### `accounting-service`

```env
PORT=3007
DB_HOST=accounting_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=accounting_db
DB_PORT=5432
JWT_SECRET=<shared>
AI_SERVICE_URL=http://ai-service:3008
INTERNAL_SERVICE_TOKEN=<jwt_firmato_role_service>
FIRST_ATTEMPT_TIMEOUT_MS=40000
TOTAL_BUDGET_MS=52000
```

### `ai-service`

```env
PORT=3008
GEMINI_API_KEY=<chiave_api_google>
JWT_SECRET=<shared>
FIRST_ATTEMPT_TIMEOUT_MS=40000
TOTAL_BUDGET_MS=52000
MODELS=gemini-flash-latest,gemini-flash-lite-latest
```

### `frontend` (Next.js)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
INTERNAL_API_URL=http://api-gateway:80
JWT_SECRET=<shared>
```

---

## Note di sicurezza

- `JWT_SECRET` **deve essere identico** in tutti i servizi (verifica JWT locale, nessuna chiamata di rete ad `auth-service` per ogni request).
- `INTERNAL_SERVICE_TOKEN` è un JWT a lunga scadenza con `role: 'service'` — generarlo una volta e configurarlo in tutti i servizi che fanno chiamate inter-service.
- `ai-service` non è esposto sul gateway pubblico: riceve solo richieste da `accounting-service` e `document-service` sulla rete Docker interna.
- Le password nel DB di `auth-service` sono hash bcrypt — mai storicizzare password in chiaro.
