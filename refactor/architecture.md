# Architettura Tecnica — Revisioni Legali SaaS

> Documentazione tecnica architetturale. Descrive **come è costruito il software**: stack tecnologico, pattern architetturali, struttura delle componenti e integrazione con il layer AI.

---

## 1. Stack tecnologico

| Layer | Tecnologia | Versione |
|---|---|---|
| Framework | Next.js (App Router) | ^15.5 |
| Linguaggio | TypeScript | ^5.6 |
| Database | PostgreSQL via Supabase | — |
| Auth | Supabase Auth (SSR) | ^0.5 |
| AI | Google Gemini | SDK ^0.24 |
| Styling | Tailwind CSS | ^3.4 |
| Validazione | Zod | ^3.23 |
| Parsing PDF | unpdf | ^1.6 |
| Parsing XLSX | xlsx | ^0.18 |
| Deploy target | Vercel Hobby (60s function budget) | — |

---

## 2. Struttura delle route (App Router)

```
app/
├── layout.tsx                    # RootLayout — html/body wrapper
├── page.tsx                      # Root redirect → /login o /dashboard
│
├── (auth)/                       # Route group: pagine pubbliche
│   ├── login/
│   ├── reset-password/
│   ├── update-password/
│   └── account-sospeso/
│
├── (tenant)/                     # Route group: area tenant autenticata
│   ├── layout.tsx                # Sidebar + header tenant
│   ├── dashboard/
│   ├── aziende/
│   │   └── [id]/
│   ├── incarichi/
│   │   ├── [id]/
│   │   │   ├── bozze/
│   │   │   └── trimestri/
│   │   └── nuovo/
│   ├── onboarding/
│   ├── profilo/
│   └── settings/
│       ├── piano/
│       └── utenti/
│
├── (admin)/                      # Route group: pannello super admin
│   └── admin/
│       ├── page.tsx              # Dashboard admin
│       ├── tenants/
│       │   ├── [id]/
│       │   └── new/
│       └── plans/
│
└── api/
    ├── me/                       # Profilo utente corrente
    ├── auth/callback/            # Supabase OAuth callback
    ├── tenant/                   # API tenant-scoped (RLS)
    │   ├── accounting-imports/
    │   ├── assignments/
    │   ├── companies/
    │   ├── documents/
    │   ├── drafts/
    │   ├── findings/
    │   ├── profile/
    │   ├── quarters/
    │   ├── settings/
    │   ├── users/
    │   ├── vigilanza/
    │   └── working-papers/
    ├── admin/                    # API admin-only (service_role)
    │   ├── plans/
    │   ├── tenants/
    │   └── users/
    └── tenants/
        ├── onboarding/
        └── status/
```

---

## 3. Pattern architetturali

### 3.1 Server Components first

Tutte le pagine di dati sono **React Server Components** che eseguono le query Supabase direttamente nel corpo della funzione. Il pattern standard è:

```tsx
// Page.tsx — Server Component
export const dynamic = "force-dynamic"; // disabilita caching statico

export default async function MyPage() {
  const supabase = await createClient();       // client SSR cookie-based
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  
  const { data } = await supabase.from("table").select(...);
  return <ClientComponent initialData={data} />;
}
```

`force-dynamic` è necessario su tutte le pagine con dati personalizzati per utente, poiché Next.js altrimenti tenta il rendering statico (ISR).

### 3.2 Client Components per interattività

I componenti che gestiscono stato locale, form e chiamate API fetch sono Client Components, denominati con suffisso `Form.tsx` o `Client.tsx`:

- `NuovaAziendaForm.tsx` — Form controllato con `useState`
- `AziendeClient.tsx` — Lista con filtro lato client
- `BozzeSection.tsx` — CRUD interattivo con ottimistic UI
- `TenantSettingsForm.tsx` — Form di modifica impostazioni

Il pattern di interazione è: **Server Component fetcha dati iniziali → passa come props al Client Component → Client Component chiama le API REST per aggiornamenti**.

### 3.3 Route Handlers (API REST)

Tutti gli endpoint API sono **Route Handlers** Next.js (`route.ts`). Ogni handler:

1. Autentica il chiamante (`requireTenantUser()` o `requireSuperAdmin()`)
2. Valida il body con **Zod** (no validazione manuale)
3. Esegue la query Supabase
4. Restituisce `NextResponse.json()`

Pattern `requireTenantUser()` ripetuto in ogni route handler tenant:

```ts
async function requireTenantUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_active || !profile.tenant_id) return null;
  return { supabase, profile, user };
}
```

### 3.4 Separazione client Supabase

Tre client Supabase distinti per contesto:

| Client | File | Uso | Chiave |
|---|---|---|---|
| Server (SSR) | `lib/supabase/server.ts` | Server Components, Route Handlers tenant | `ANON_KEY` + RLS |
| Middleware | `lib/supabase/middleware.ts` | Middleware Next.js | `ANON_KEY` + RLS |
| Admin (service_role) | `lib/supabase/admin.ts` | Route Handlers admin | `SERVICE_ROLE_KEY` — bypassa RLS |
| Client (browser) | `lib/supabase/client.ts` | Client Components (se necessario) | `ANON_KEY` + RLS |

Il client admin **non viene mai importato da componenti client**. È usato esclusivamente nei Route Handlers sotto `/api/admin/` e nelle operazioni di creazione utenti (che richiedono il bypass RLS).

---

## 4. Sicurezza e multi-tenancy

### 4.1 Row Level Security (RLS)

Ogni tabella ha RLS abilitato. L'isolamento tenant è garantito da funzioni PostgreSQL `SECURITY DEFINER`:

```sql
-- Helper functions (evitano ricorsione RLS su user_profiles)
CREATE FUNCTION public.current_user_tenant() RETURNS UUID ...
CREATE FUNCTION public.current_user_role()   RETURNS TEXT ...
CREATE FUNCTION public.is_super_admin()      RETURNS BOOLEAN ...
```

Le policy applicano il filtro `tenant_id = current_user_tenant()` su ogni tabella operativa. Il super_admin bypassa tutte le policy tramite `is_super_admin() = TRUE`.

### 4.2 Field-level guard (trigger)

Due trigger database prevengono modifiche a campi critici da parte di ruoli non autorizzati:

- **`tenants_guard_protected_fields`**: impedisce ai `tenant_owner` di modificare `status`, `plan_id`, `plan_expires_at`
- **`user_profiles_guard_protected_fields`**: impedisce agli utenti di modificare il proprio `role` o `tenant_id`

Questo è un secondo livello di difesa oltre alle RLS policy.

### 4.3 Middleware di autenticazione

`middleware.ts` intercetta ogni richiesta non statica e implementa la macchina a stati di routing:

```
Request
  ├─ Path statico o /api/ → pass-through
  ├─ Utente non autenticato
  │   ├─ Rotta pubblica → accesso
  │   └─ Rotta protetta → redirect /login?redirectTo=...
  └─ Utente autenticato
      ├─ Profilo non trovato o is_active=false → signOut + redirect /login
      ├─ super_admin su /dashboard o /onboarding → redirect /admin
      ├─ tenant_user su /admin/* → redirect /dashboard
      ├─ onboarding_completed=false → redirect /onboarding (eccetto /onboarding stesso)
      └─ tenant sospeso → redirect /account-sospeso
```

Il middleware usa `supabase.auth.getUser()` (non `getSession()`) per validare il JWT contro il server auth ad ogni richiesta — conforme alle best practice Supabase per SSR.

### 4.4 Auth trigger database

Un trigger PostgreSQL `on_auth_user_created` crea automaticamente una riga `user_profiles` quando viene creato un nuovo utente in `auth.users`. Legge metadati opzionali (`tenant_id`, `role`, `full_name`) da `raw_app_meta_data` / `raw_user_meta_data`, consentendo al flusso admin di pre-configurare il profilo al momento della creazione.

---

## 5. Schema del database

### Tabelle principali

```
plans                    → Piani di abbonamento SaaS
tenants                  → Studi di revisione (clienti del SaaS)
user_profiles            → Utenti (1:1 con auth.users, n:1 con tenants)

companies                → Aziende clienti (per tenant)
assignments              → Incarichi di revisione (per company, per year)
assignment_members       → M2M: utenti assegnati a un incarico
quarters                 → 4 trimestri per incarico (auto-creati)

working_papers           → Carte di lavoro (per quarter, per area)
findings                 → Rilievi (per quarter, opz. per working_paper)
drafts                   → Bozze documenti ufficiali (per assignment, opz. per quarter)
documents                → Documenti caricati (allegati)

accounting_imports       → Import contabili (header del file caricato)
accounting_entries       → Voci contabili (righe dell'import, arricchite da AI)
vigilanza_items          → Checklist di vigilanza trimestrale
```

### Relazioni chiave

```
tenants         1──n  user_profiles
tenants         1──n  companies
tenants         1──n  assignments
assignments     1──4  quarters
quarters        1──n  working_papers
quarters        1──n  findings
quarters        1──n  accounting_imports
quarters        1──n  vigilanza_items
assignments     1──n  drafts
accounting_imports 1──n accounting_entries
```

### Campo `tenant_id` denormalizzato

Le tabelle operative (`working_papers`, `findings`, `accounting_imports`, `accounting_entries`, `vigilanza_items`, `drafts`) portano un campo `tenant_id` ridondante. Questo è intenzionale: consente alle RLS policy di filtrare per tenant in modo efficiente senza dover traversare join multipli.

---

## 6. Architettura dell'integrazione AI

### 6.1 Visione generale

L'AI è integrata esclusivamente nell'**import contabile**. Il modello viene invocato lato server (Route Handler), mai dal browser. Il flusso è progettato per minimizzare i token e rispettare il budget di esecuzione Vercel Hobby (60s per function).

### 6.2 Pipeline di import AI

```
┌────────────────────────────────────────────────────────────┐
│  CLIENT (browser)                                          │
│  Upload file (PDF/CSV/XLSX)                                │
└──────────────┬─────────────────────────────────────────────┘
               │ multipart/form-data
               ▼
┌────────────────────────────────────────────────────────────┐
│  ROUTE HANDLER  /api/tenant/accounting-imports  (POST)     │
│                                                            │
│  1. PARSE locale (lib/accounting/parsers.ts)               │
│     ├─ CSV  → parseCSV()                                   │
│     ├─ XLSX → parseSpreadsheet()                           │
│     └─ PDF  → parsePDF()                                   │
│                                                            │
│  2. RETURN parsed entries al client (Step 1 wizard)        │
└──────────────┬─────────────────────────────────────────────┘
               │ entries JSON (senza AI)
               ▼
┌────────────────────────────────────────────────────────────┐
│  CLIENT — Wizard di mapping                                │
│  Preview entries + possibilità di correzione manuale       │
└──────────────┬─────────────────────────────────────────────┘
               │ POST /api/tenant/accounting-imports (JSON branch)
               ▼
┌────────────────────────────────────────────────────────────┐
│  ROUTE HANDLER — Branch JSON con entries validate          │
│                                                            │
│  3. MAPPING AI (lib/gemini/mapBilancio.ts)                 │
│     ├─ filterEntries(): rimuove saldo=0 e nomi vuoti       │
│     ├─ Costruisce prompt strutturato con regole c.c.       │
│     ├─ Tenta gemini-flash-latest (timeout 40s)             │
│     └─ Fallback gemini-flash-lite-latest (budget residuo)  │
│                                                            │
│  4. RICONCILIAZIONE                                        │
│     ├─ Merge risposta AI con entries originali             │
│     ├─ Priorità layout PDF (pdf_section) su schema AI      │
│     └─ Fallback classifyAccount() per audit_area           │
│                                                            │
│  5. PERSISTENZA                                            │
│     ├─ INSERT accounting_imports (header)                  │
│     └─ INSERT accounting_entries (voci arricchite)         │
└────────────────────────────────────────────────────────────┘
```

### 6.3 Struttura del prompt Gemini

Il prompt è un sistema a regole deterministiche ispirato alle norme del codice civile italiano (artt. 2424–2425 c.c.). Contiene:

- **Regole SP Attivo** (immobilizzazioni materiali, immateriali, crediti, ratei, liquidità)
- **Regole SP Passivo** (patrimonio netto, debiti verso banche, fornitori, erario, previdenza)
- **Regole Conto Economico** (ricavi, acquisti, costi del personale, oneri finanziari)
- **Regole fondi ammortamento**

Il formato di output richiesto è JSON array puro (no markdown), mappando ogni voce al suo `voce_standard` civilistico, `schema` (SP_A/SP_P/CE/MEMO) e `audit_area`.

Strategia token: le voci vengono compattate in oggetti `{c, n, v}` (codice, nome, valore) prima di essere inserite nel prompt, riducendo drasticamente l'utilizzo di token.

### 6.4 Gestione fallback e resilienza

```ts
// Budget management (vercel hobby: 60s totali)
const TOTAL_BUDGET_MS = 52_000; // 8s reserved for parsing/response
const FIRST_ATTEMPT_MS = 40_000;

const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

for (const modelName of MODELS) {
  // Budget check prima di ogni tentativo
  if (remaining < 8_000) break;
  
  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise(reject => setTimeout(reject, attemptTimeoutMs))
  ]);
  // se OK → return
}

// Fallback: classifyAccount() basato su keyword matching locale
```

La funzione `classifyAccount()` in `lib/audit/classification.ts` è il fallback deterministico: mappa le voci per keyword matching senza AI.

### 6.5 Priorità di determinazione dello schema civilistico

L'architettura implementa una gerarchia di priorità per garantire accuratezza:

```
1. pdf_section (rilevata dal layout fisico del PDF)  ← massima priorità
2. schema da Gemini AI
3. classifyAccount() keyword matching               ← minima priorità
```

Il layout PDF è più affidabile dell'AI perché i PDF di bilancio italiani hanno sezioni standard (SP Attivo, SP Passivo, CE) con separatori fisici noti.

### 6.6 Moduli AI per tipo di piano

| Funzione AI | Piano richiesto |
|---|---|
| Mapping bilancio (Gemini) | Gold (advanced_import) |
| Bozze AI | Medium / Gold (ai_drafts_module) |
| Quota AI (tracking token) | Tutti — quota NULL = illimitata |

---

## 7. Pattern di componenti UI

### 7.1 Gerarchia Server → Client

```
Page.tsx (Server Component)
  ├─ Fetcha dati da Supabase
  ├─ Gestisce redirect e auth guard
  └─ Renderizza:
       ├─ Layout statico (titoli, breadcrumb)
       └─ *Form.tsx / *Client.tsx (Client Component)
            ├─ Riceve dati iniziali come props
            ├─ Gestisce stato locale con useState
            └─ Chiama API REST con fetch()
```

### 7.2 Componenti UI condivisi

```
components/ui/
├─ Button.tsx    → Varianti: primary, secondary, danger
├─ Input.tsx     → Label + input con gestione errori
└─ Alert.tsx     → Toni: success, error, warning, info

components/
└─ LogoutButton.tsx  → Client Component per logout
```

Non esiste un design system strutturato — i componenti sono utility minimali costruiti con Tailwind.

### 7.3 Naming conventions

| Pattern | Significato |
|---|---|
| `page.tsx` | Route page (Server Component) |
| `layout.tsx` | Layout persistente per una route group |
| `*Form.tsx` | Client Component con form controllato |
| `*Client.tsx` | Client Component con stato locale (lista, filtri) |
| `*Section.tsx` | Client Component sezione parziale di una pagina |
| `route.ts` | API Route Handler |

---

## 8. Flusso di autenticazione (dettaglio tecnico)

```
Browser → POST /auth/signin (Supabase SDK)
  ↓
Supabase Auth → emette JWT + refresh token
  ↓
Supabase SSR → setta cookie HttpOnly
  ↓
Next.js middleware (su ogni request)
  ├─ createMiddlewareClient() → crea client che legge cookie
  ├─ supabase.auth.getUser() → valida JWT contro server auth
  ├─ Legge user_profiles da DB (non da JWT claims)
  └─ Applica routing logic
```

Il profilo utente (ruolo, tenant, stato) è sempre **letto dal database** a ogni request nel middleware, mai dai claims JWT. Questo previene che profili modificati (es. disattivati) rimangano attivi fino alla scadenza del JWT.

---

## 9. Configurazione e variabili d'ambiente

| Variabile | Scope | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | URL istanza Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client anon (soggetto a RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Admin client (bypassa RLS) |
| `GEMINI_API_KEY` | Server-only | Google Gemini API |

---

## 10. Decisioni architetturali rilevanti

### 10.1 Perché Route Handlers invece di Server Actions?

Le API REST sono scelte deliberate per:
- **Testabilità**: le route possono essere chiamate da client, test, strumenti esterni
- **Disaccoppiamento**: il client component non dipende da `"use server"`
- **Compatibilità Vercel Hobby**: le Server Actions e i Route Handlers condividono lo stesso budget di esecuzione; i Route Handler sono più prevedibili nel comportamento di timeout

### 10.2 Perché `tenant_id` denormalizzato?

La denormalizzazione di `tenant_id` su tabelle figlie (invece di derivarlo via join) è una scelta di performance e sicurezza RLS:
- Le policy RLS eseguono **per ogni riga** — un join aggiuntivo a ogni valutazione sarebbe costoso
- Semplifica le policy: `tenant_id = current_user_tenant()` senza subquery
- PostgreSQL può usare indici su `tenant_id` direttamente

### 10.3 Perché AI solo lato server?

La chiave Gemini è server-only per:
- **Sicurezza**: non esposta nel bundle client
- **Controllo costi**: il server può applicare rate limiting e rispettare la quota del piano
- **Budget timeout**: la gestione del budget di esecuzione Vercel è applicabile solo server-side

### 10.4 Perché il layout PDF ha priorità sull'output AI?

I PDF di bilancio italiano seguono uno schema fisico standardizzato. I parser PDF rilevano la sezione (`SP_A`, `SP_P`, `CE_R`, `CE_C`) dal contesto visivo del documento, che è intrinsecamente più affidabile di un'inferenza linguistica. L'AI viene usata per la mappatura fine delle voci (qual è la voce civilistica esatta), non per la classificazione macro dello schema.

---

## 11. Punti critici e debito tecnico identificato

| Area | Problema | Impatto |
|---|---|---|
| `requireTenantUser()` | Duplicato in ogni route handler | Manutenzione — refactor in middleware o helper condiviso |
| AI budget management | Hard-coded per Vercel Hobby | Non scalabile al cambio piano deploy |
| Validazione Zod | Non centralizzata — ogni route ridefinisce schema | Inconsistenze possibili |
| Client components | Nessuna gestione errori di rete centralizzata | UX degradata su errori intermittenti |
| RLS policies | Assenti sulle tabelle più recenti (vigilanza, accounting) | Da verificare e completare |
| Quota AI | Tracking quota AI (`ai_quota` sul piano) non ancora enforced | Potenziale abuso su piano Small/Medium |
| Tipizzazione DB | Tipi Supabase (`types.ts`) parziali — coprono solo le entity principali | Type safety incompleta sui join |
