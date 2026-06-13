# SKILLS — Revisioni Legali

> Token-minimal reference for code changes. Read this before touching any file.
> **Keep this file updated** whenever you add a microservice, a new API route, a new UI component, or change any of the patterns below.

---

## 1. Repository layout

```
revisionilegali/
├── frontend/               ← Next.js 14 App Router (the only active frontend)
│   ├── app/
│   │   ├── (admin)/        ← super_admin-only pages
│   │   ├── (auth)/         ← unauthenticated pages (login, reset-password, update-password)
│   │   ├── (tenant)/       ← all tenant-user pages (protected by layout.tsx)
│   │   └── api/            ← Next.js route handlers (thin proxies to the API gateway)
│   ├── components/ui/      ← Button, Input, Alert (only 3 shared components)
│   ├── lib/
│   │   ├── api.ts          ← server-side gw() / gwJson() (Server Components, Layouts)
│   │   ├── client-api.ts   ← browser-side apiFetch() / setAuthToken() (Client Components)
│   │   └── types.ts        ← shared TypeScript types (UserRole, Tenant, Plan, MeResponse…)
│   ├── middleware.ts        ← auth guard + onboarding/tenant-status redirects
│   └── next.config.mjs     ← output: "standalone"
│
├── refactor/backend/
│   └── services/           ← Node.js / Express microservices
│       ├── auth/           ← port 3001 / auth_db (5433)
│       ├── tenant/         ← port 3002 / tenant_db (5434)
│       ├── company/        ← port 3003 / company_db (5435)
│       ├── assignment/     ← port 3004 / assignment_db (5436)
│       ├── audit/          ← port 3005 / audit_db (5437)
│       ├── document/       ← port 3006 / document_db (5438)
│       ├── accounting/     ← port 3007 / accounting_db (5439)
│       └── ai/             ← port 3008 / no DB (internal only, not exposed via gateway)
│
├── docker/
│   ├── docker-compose.yml  ← full stack definition
│   └── nginx/nginx.conf    ← API gateway routing (path-based)
│
├── skills/                 ← THIS folder
│   └── SKILLS.md
│
└── docs/                   ← non-authoritative product notes
    ├── MVP_SCOPE.md
    └── AI_USAGE_PROTOCOL.md
```

> The root-level `app/`, `lib/`, `components/` directories are **legacy remnants** — the live code is entirely under `frontend/`.

---

## 2. Architecture overview

```
Browser
  │  cookie: auth_token (JWT, SameSite=Lax, non-HttpOnly)
  ▼
Next.js frontend (3000)
  │  middleware.ts — JWT verify + tenant-status check on every request
  │  Server Components → lib/api.ts → gw() / gwJson()
  │  Client Components → lib/client-api.ts → apiFetch()
  │  app/api/** → thin Next.js route handlers (proxy to gateway)
  ▼
Nginx API Gateway (8080)   ← path-based routing, handles CORS
  ├─ /api/auth       → auth-service:3001
  ├─ /api/tenants    → tenant-service:3002
  ├─ /api/plans      → tenant-service:3002
  ├─ /api/companies  → company-service:3003
  ├─ /api/assignments → assignment-service:3004
  ├─ /api/quarters   → assignment-service:3004
  ├─ /api/audit      → audit-service:3005
  ├─ /api/documents  → document-service:3006
  ├─ /api/drafts     → document-service:3006
  └─ /api/accounting → accounting-service:3007
       └─ (ai-service:3008 — internal only, called by accounting & document)
```

Each microservice has its own PostgreSQL 15 database. Auth is custom JWT (not Supabase).

---

## 3. Auth flow

1. `POST /api/auth/login` → returns `{ access_token }` (JWT, 7d expiry)
2. Frontend stores token as a non-HttpOnly cookie named `auth_token` via `setAuthToken()` in [client-api.ts](../frontend/lib/client-api.ts)
3. `middleware.ts` reads `auth_token`, calls `GET /api/auth/verify`, then `GET /api/tenants/:id/status` on every non-public, non-static request
4. JWT payload: `{ id, email, role, tenant_id }`

### Roles
| Role | Access |
|---|---|
| `super_admin` | `/admin/*` only |
| `tenant_owner` | full tenant access, can edit settings/users |
| `revisor` | can edit working papers, findings, quarters |
| `collaborator` | read + limited write |
| `syndic` | vigilanza module |

`canEdit` in pages = `["tenant_owner", "revisor"].includes(me.profile.role)`

---

## 4. Frontend patterns

### 4.1 Server vs Client Components

| Context | Fetch helper | Where |
|---|---|---|
| Server Component / Layout | `gwJson<T>(path)` or `gw(path)` | `lib/api.ts` — reads `auth_token` cookie via `next/headers` |
| Client Component | `apiFetch(path, init)` | `lib/client-api.ts` — reads cookie from `document.cookie` |
| Next.js API route proxy | `proxyTo` / `proxyFormDataTo` / `proxyDownloadTo` | `app/api/_proxy.ts` |

All Server Components that fetch data must export `export const dynamic = "force-dynamic"`.

### 4.2 Page pattern (Server Component)

```tsx
export const dynamic = "force-dynamic";

export default async function SomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await gwJson<SomeType>(`/api/some-resource/${id}`);
  if (!data) redirect("/some-parent");
  return <ClientComponent initialData={data} />;
}
```

Pages pass initial server-fetched data as props to Client Components. Client Components handle mutations and local state.

### 4.3 Client Component mutation pattern

```tsx
"use client";
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  setLoading(true);
  const res = await apiFetch("/api/some-resource", { method: "POST", body: JSON.stringify(data) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { setError(json.error ?? "Errore generico"); setLoading(false); return; }
  router.push("/some-destination");
}
```

### 4.4 UI components (`components/ui/`)

| Component | Key props |
|---|---|
| `Button` | `variant?: "primary"\|"secondary"\|"ghost"\|"danger"`, `size?: "sm"\|"md"\|"lg"`, `loading?: boolean` |
| `Input` | `label?: string`, `error?: string` — extends `InputHTMLAttributes` |
| `Alert` | `tone?: "info"\|"success"\|"error"\|"warning"` — success auto-dismisses after 5 s |

Brand color: `brand-600` = `#1a5fa8`. Tailwind `brand-{50..900}` palette defined in `tailwind.config.ts`.

### 4.5 Next.js API route proxy pattern

Most routes are one-liners using `_proxy.ts`:

```ts
// app/api/assignments/route.ts
import { NextRequest } from "next/server";
import { proxyTo } from "../_proxy";

async function handler(req: NextRequest) {
  return proxyTo(req, `/api/assignments${req.nextUrl.search}`);
}
export const GET = handler;
export const POST = handler;
```

For file uploads use `proxyFormDataTo`; for binary downloads use `proxyDownloadTo`.
The `ai-preview` route has a custom handler because of special FormData/error logging needs.

### 4.6 Path → Next.js API route → gateway mapping

| Frontend fetch path | Next.js handler file | Gateway upstream |
|---|---|---|
| `/api/assignments[?...]` | `app/api/assignments/route.ts` | `assignment-service:3004` |
| `/api/assignments/:id` | `app/api/assignments/[assignmentId]/route.ts` | same |
| `/api/quarters/:id` | `app/api/quarters/[quarterId]/route.ts` | `assignment-service:3004` |
| `/api/companies[/:id]` | `app/api/companies/[...]/route.ts` | `company-service:3003` |
| `/api/audit/working-papers` | `app/api/audit/findings/route.ts` etc. | `audit-service:3005` |
| `/api/audit/findings` | same folder | `audit-service:3005` |
| `/api/audit/vigilanza` | same folder | `audit-service:3005` |
| `/api/documents[/:id]` | `app/api/documents/route.ts` | `document-service:3006` |
| `/api/drafts[/:id]` | `app/api/drafts/route.ts` | `document-service:3006` |
| `/api/accounting/imports` | `app/api/accounting/imports/route.ts` | `accounting-service:3007` |
| `/api/accounting/imports/ai-preview` | `app/api/accounting/imports/ai-preview/route.ts` | `accounting-service:3007` |
| `/api/auth/login` | (proxied directly by client through gateway) | `auth-service:3001` |
| `/api/auth/me` | (Server Component direct call) | `auth-service:3001` |

---

## 5. Backend microservice patterns

Every service follows the same structure. See [refactor/backend/SKILLS.md](../refactor/backend/SKILLS.md) for the exhaustive boilerplate reference.

### 5.1 Service anatomy

```
services/<name>/
  index.js          ← Express app, db.sequelize.sync(), listen
  config/config.js  ← Sequelize connection config (reads env vars)
  middleware/auth.js ← JWT verify (shared pattern, JWT_SECRET from env)
  models/
    index.js        ← auto-loader (never edit)
    <Entity>.js     ← Sequelize model
  migrations/       ← sequelize-cli migration files
  controllers/      ← business logic
  routes/
    index.js        ← health check + router.use(...)
    <entity>Routes.js
  Dockerfile        ← node:18-alpine, CMD ["npm", "run", "dev"]
  package.json
```

### 5.2 Auth middleware (identical in all services)

```js
const jwt = require('jsonwebtoken');
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET || 'change_me_in_production', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;   // { id, email, role, tenant_id }
    next();
  });
};
```

### 5.3 Controller patterns

- Error response: `res.status(500).json({ error: 'Errore interno del server' })`
- 404: `res.status(404).json({ error: '<Entità> non trovata' })`
- 201 on create: `res.status(201).json(record)`
- 204 on delete: `res.status(204).send()`
- Multi-tenant isolation: always filter by `tenant_id: req.user.tenant_id`
- Models accessed via `req.app.locals.db.<ModelName>` (some services) or direct `require('../models')`

### 5.4 Service ports

| Service | App port | Debug port | DB host port |
|---|---|---|---|
| auth | 3001 | 9229 | 5433 |
| tenant | 3002 | 9230 | 5434 |
| company | 3003 | 9231 | 5435 |
| assignment | 3004 | 9232 | 5436 |
| audit | 3005 | 9233 | 5437 |
| document | 3006 | 9234 | 5438 |
| accounting | 3007 | 9235 | 5439 |
| ai | 3008 | — | — (no DB) |

### 5.5 Inter-service calls

Services call each other using env vars:
- `AUTH_SERVICE_URL=http://auth-service:3001`
- `TENANT_SERVICE_URL=http://tenant-service:3002`
- `AUDIT_SERVICE_URL=http://audit-service:3005`
- `AI_SERVICE_URL=http://ai-service:3008`

Internal-only calls to `ai-service` use header `X-Internal-Token: <INTERNAL_SERVICE_TOKEN>`.

---

## 6. Domain model

### Core entities

| Entity | Service | Key fields |
|---|---|---|
| `UserProfile` | auth | `id`, `email`, `password_hash`, `role`, `tenant_id`, `full_name`, `is_active` |
| `Tenant` | tenant | `id`, `name`, `status` (active/suspended/trial), `plan_id`, `onboarding_completed` |
| `Plan` | tenant | `max_assignments`, `max_users`, `ai_quota`, `vigilance_module`, `ai_drafts_module`, `advanced_import` |
| `Company` | company | `id`, `tenant_id`, `name`, `vat_number`, … |
| `Assignment` | assignment | `id`, `tenant_id`, `company_id`, `year`, `type` (revisione_legale/collegio_sindacale/sindaco_unico) |
| `Quarter` | assignment | `id`, `assignment_id`, `quarter` (1–4), `status` (aperto/in_corso/chiuso) |
| `WorkingPaper` | audit | `id`, `quarter_id`, `tenant_id`, `title`, `area`, `status` (bozza/in_revisione/approvata) |
| `Finding` | audit | `id`, `quarter_id`, `tenant_id`, `title`, `severity` (alta/media/bassa), `status` |
| `VigilanzaItem` | audit | `id`, `quarter_id`, `tenant_id`, `item`, `category`, `done` |
| `Document` | document | `id`, `quarter_id`, `tenant_id`, `name`, `file_path`, `category` |
| `Draft` | document | `id`, `quarter_id`, `assignment_id`, `tenant_id`, `title`, `type`, `content` (rich text) |
| `AccountingImport` | accounting | `id`, `quarter_id`, `assignment_id`, `tenant_id`, `file_type`, `status` (processing/completed/error) |
| `AccountingEntry` | accounting | `id`, `import_id`, `account_code`, `account_name`, `balance`, `balance_prev`, `voce_bilancio`, `voce_bilancio_code`, `mapped_at` |

### Audit areas (working papers / risk classification)

`cassa_banche`, `crediti_clienti`, `debiti_fornitori`, `immobilizzazioni`, `rimanenze`, `patrimonio_netto`, `ricavi`, `costi`, `imposte`, `adempimenti`, `altro`

### Balance sheet schema codes (AI mapping output)

`SP_A` (Stato Patrimoniale Attivo), `SP_P` (SP Passivo+PN), `CE` (Conto Economico), `MEMO`

---

## 7. AI service (`ai-service:3008`)

- Uses **Google Gemini** (`GEMINI_API_KEY` env var)
- Endpoint: `POST /api/map-bilancio` — maps accounting entries to Italian Civil Code schema
- Input: `{ entries: [{ account_code, account_name, balance, balance_prev, pdf_section }] }`
- Output: `{ entries: [{ ...original, voce_standard, schema_civilistico, audit_area }] }`
- Max 2000 entries per call; 30 s timeout; falls back to deterministic local classification if Gemini fails
- Not exposed through Nginx — only called service-to-service via `X-Internal-Token`
- `POST /api/map-bilancio/local` — deterministic fallback, no AI

---

## 8. Accounting import flow

1. Browser uploads file to `POST /api/accounting/imports/ai-preview` (Next.js proxy → accounting-service)
2. Accounting-service parses PDF/XLSX/CSV, calls ai-service synchronously, returns enriched entries (no DB write)
3. User reviews entries in `ImportWizard.tsx`
4. Browser calls `POST /api/accounting/imports` with pre-parsed JSON entries (no file upload)
5. Accounting-service saves `AccountingImport` + `AccountingEntry[]` rows
6. `POST /api/accounting/imports/:id/analisi` groups entries by audit area, creates `WorkingPaper` records in audit-service
7. `POST /api/accounting/imports/:id/rilievi` detects >20% variance findings, creates `Finding` records in audit-service

---

## 9. Nginx API gateway rules

- CORS: handled at gateway level, strips upstream CORS headers to avoid duplicates
- `client_max_body_size 50M` (for PDF/XLSX uploads)
- Proxy timeouts: 120 s
- `ai-service` has no nginx route — internal only
- All upstream vars use `set $var` pattern for lazy DNS resolution (Docker internal resolver `127.0.0.11`)

---

## 10. Deployment

- CI/CD: `.github/workflows/deploy-production.yml` — push to `main` → rsync to server → `docker compose up -d --build`
- Server path: `/opt/revisionilegali/docker/`
- Secrets: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`
- Runtime env vars sourced from `docker/.env` on the server (`JWT_SECRET`, `GEMINI_API_KEY`, `INTERNAL_SERVICE_TOKEN`)

---

## 11. Adding a new microservice

Use the scaffolding script, then update this file:

```bash
cd refactor/backend
python create_ms.py <name>
```

Then:
1. Add service + db to `docker/docker-compose.yml` (pick next available ports)
2. Add nginx location block in `docker/nginx/nginx.conf`
3. Add Next.js proxy routes in `frontend/app/api/`
4. Update the port table in §5.4 of this file
5. Update the gateway routing table in §2 of this file

See [refactor/backend/SKILLS.md](../refactor/backend/SKILLS.md) for the exhaustive boilerplate patterns.

---

## 12. Adding a new page / feature

### New tenant page
1. Create `frontend/app/(tenant)/<path>/page.tsx` (Server Component, `force-dynamic`)
2. Fetch data with `gwJson<T>()` in the page; pass as props to Client Component
3. Create `<Feature>Client.tsx` (Client Component) for mutations
4. If new API endpoints are needed: add Next.js route in `frontend/app/api/` using `proxyTo` from `_proxy.ts`
5. Add the controller function + route registration in the relevant microservice

### New API endpoint
- Backend: add function to existing `controllers/<entity>Controller.js`, register in `routes/<entity>Routes.js`
- Frontend proxy: add or update `frontend/app/api/<resource>/route.ts` using `proxyTo`
- Update §4.6 path table if adding a new proxy route

---

## 13. Conventions cheat sheet

| Topic | Convention |
|---|---|
| Language (UI strings) | Italian (tutto il testo visibile è in italiano) |
| JS/TS variable names | camelCase |
| DB column names | snake_case |
| Model class name | PascalCase singular (`Assignment`, `WorkingPaper`) |
| DB table name | snake_case plural (`assignments`, `working_papers`) |
| FK columns | `<entity>_id` |
| Sequelize `as:` alias | camelCase, consistent between model and query |
| Error response shape | `{ error: "human-readable message" }` |
| Success create | HTTP 201 |
| Success delete | HTTP 204 (no body) |
| Health check endpoint | `GET /api/health` → `{ status: "OK", service: "..." }` |
| Auth cookie name | `auth_token` |
| Brand color class | `brand-600` (primary buttons, links, accents) |
| Page max-width | `max-w-6xl` (nav/header), `max-w-2xl` (detail pages) |

---

## 14. Maintenance rule

**Update this file whenever you:**
- Add or remove a microservice
- Add a new nginx route or change an existing one
- Add a new Next.js API proxy route
- Add a new shared UI component in `components/ui/`
- Change the auth flow, JWT payload, or cookie strategy
- Add a new domain entity or rename an existing one
- Change deployment workflow or server layout
- Change inter-service communication patterns
