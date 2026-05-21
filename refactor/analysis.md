# Analisi Funzionale — Revisioni Legali SaaS

> Documentazione funzionale dell'applicazione. Descrive **cosa fa il software**, chi lo usa e come si articolano i flussi operativi principali.

---

## 1. Descrizione del prodotto

**Revisioni Legali** è un SaaS multi-tenant destinato a studi di revisione legale e collegi sindacali italiani. Consente ai professionisti della revisione di gestire l'intero ciclo di un incarico: dall'anagrafica aziendale all'import dei dati contabili, dalla redazione delle carte di lavoro alla generazione di bozze di relazione, fino alla vigilanza trimestrale.

Il prodotto si posiziona come uno strumento **orientato al flusso operativo**, non a menù statici: ogni schermata è progettata per guidare l'utente verso la prossima azione utile all'interno del proprio incarico.

---

## 2. Attori del sistema

| Ruolo | Descrizione | Livello di accesso |
|---|---|---|
| `super_admin` | Proprietario della piattaforma SaaS | Accesso globale a tutti i tenant, piani, utenti |
| `tenant_owner` | Titolare dello studio di revisione | Gestione completa del proprio tenant |
| `revisor` | Revisore legale | Creazione/modifica incarichi, carte, rilievi, bozze |
| `collaborator` | Collaboratore dello studio | Accesso in lettura/scrittura limitato agli incarichi assegnati |
| `syndic` | Sindaco / membro del collegio | Accesso ai verbali e alla vigilanza del proprio incarico |

Ogni utente (eccetto il super_admin) appartiene a **un singolo tenant**. Il super_admin non ha tenant.

---

## 3. Struttura del tenant

Un **tenant** rappresenta uno studio di revisione. Ogni tenant dispone di:
- un **piano di abbonamento** (Small / Medium / Gold) che ne determina i limiti
- un **team di utenti** con ruoli differenziati
- un **catalogo di aziende** clienti
- un insieme di **incarichi** attivi, passati e archiviati

### 3.1 Piani di abbonamento

| Piano | Incarichi max | Utenti max | Storage | Quota AI | Vigilanza | Bozze AI | Import avanzato |
|---|---|---|---|---|---|---|---|
| Small | 5 | 3 | 5 GB | 100 | No | No | No |
| Medium | 25 | 10 | 25 GB | 500 | Sì | Sì | No |
| Gold | 200 | 50 | 200 GB | Illimitata | Sì | Sì | Sì |

Il piano controlla anche quali moduli funzionali sono attivi per il tenant.

---

## 4. Oggetti principali del dominio

### 4.1 Azienda (`companies`)
L'unità fondamentale del lavoro operativo. Rappresenta il cliente revisionato. Contiene:
- ragione sociale, codice fiscale / P.IVA
- settore merceologico
- città e provincia
- flag `is_archived` per nascondere aziende non più attive senza cancellarle

### 4.2 Incarico (`assignments`)
Un incarico è l'attività di revisione o vigilanza svolta su un'azienda in un determinato esercizio. Ogni incarico ha:
- **tipo**: `revisione_legale` | `collegio_sindacale` | `sindaco_unico`
- **anno** di esercizio (es. 2025)
- **stato**: `aperto` | `in_corso` | `chiuso`
- **team**: un insieme di utenti assegnati (`assignment_members`)
- **4 trimestri** creati automaticamente alla creazione dell'incarico

### 4.3 Trimestre (`quarters`)
I 4 trimestri di un incarico sono il contenitore operativo del lavoro periodico. Ogni trimestre aggrega:
- documenti caricati
- carte di lavoro compilate
- rilievi rilevati
- checklist di vigilanza
- bozze di verbale trimestrale
- import contabili

### 4.4 Carta di lavoro (`working_papers`)
Documento di lavoro interno al revisore, collegato a un trimestre e a un'area di audit. Aree supportate:
`cassa_banche`, `crediti_clienti`, `debiti_fornitori`, `immobilizzazioni`, `rimanenze`, `patrimonio_netto`, `ricavi`, `costi`, `imposte`, `adempimenti`, `altro`.

Stati: `in_revisione` → `completata`.

### 4.5 Rilievo (`findings`)
Un'anomalia, carenza o osservazione emersa durante il lavoro di revisione. Ha:
- titolo e descrizione
- raccomandazione
- severità: `bassa` | `media` | `alta` | `critica`
- stato: aperto → chiuso
- scadenza (`due_date`)
- collegamento opzionale a una carta di lavoro

### 4.6 Bozza / Documento (`drafts`)
Documento ufficiale in fase di redazione. Tipi supportati:
- `relazione_revisione` — Relazione finale di revisione indipendente
- `lettera_direzione` — Comunicazione al management (ISA Italia 265)
- `verbale_collegio` — Verbale del collegio sindacale
- `verbale_sindaco` — Verbale del sindaco unico
- `altro` — Documento libero

Ogni bozza parte da un **template predefinito** compilato con i dati dell'incarico (nome azienda, anno, revisore). Lo stato evolve da `bozza` a `definitivo`.

### 4.7 Import contabile (`accounting_imports` + `accounting_entries`)
Dati di bilancio caricati in formato CSV, XLSX o PDF. Ogni import contiene n voci contabili, ognuna delle quali viene:
1. **estratta localmente** (senza AI) tramite parser dedicati
2. **arricchita dall'AI** con la mappatura civilistica secondo gli artt. 2424–2425 c.c.

Le voci arricchite includono: `voce_standard` (es. "C.II.1 Crediti verso clienti"), `schema_civilistico` (SP_A / SP_P / CE / MEMO), `audit_area`.

### 4.8 Vigilanza (`vigilanza_items`)
Checklist di attività di vigilanza trimestrale, basata su un **template standard** predefinito, suddiviso in categorie:
- `contabilità` — Tenuta libri, principi contabili
- `governance` — Corretta amministrazione, verbali CdA, parti correlate
- `adempimenti` — Obblighi tributari, previdenziali, depositi
- `controllo_interno` — Sistema di controllo, antiriciclaggio

---

## 5. Flussi operativi principali

### 5.1 Primo accesso e onboarding

1. Il super_admin crea il tenant e l'utente `tenant_owner` tramite il pannello admin
2. L'utente riceve le credenziali e accede per la prima volta
3. Il middleware rileva `onboarding_completed = false` e reindirizza a `/onboarding`
4. L'utente compila i dati minimi dello studio (nome, referente, P.IVA, timezone)
5. Al salvataggio, `onboarding_completed` viene impostato a `true`
6. L'utente atterra sulla dashboard operativa

### 5.2 Avvio di un nuovo incarico

1. Il `tenant_owner` o `revisor` accede alla sezione **Aziende** e seleziona (o crea) l'azienda cliente
2. Naviga in **Incarichi** → "Nuovo incarico"
3. Sceglie: azienda, tipo incarico, anno di esercizio, note, team assegnato
4. Il sistema crea automaticamente **4 trimestri** per l'incarico
5. L'incarico è immediatamente disponibile con stato `aperto`

### 5.3 Lavoro trimestrale

1. Dal dettaglio incarico si seleziona il trimestre di interesse
2. Il revisore carica i **documenti** di riferimento (estratti conto, fatture, ecc.)
3. Apre o crea **carte di lavoro** per ogni area di audit rilevante
4. Se disponibile (piano Medium/Gold), carica il **bilancio di verifica** che viene mappato automaticamente con AI
5. Registra eventuali **rilievi** con severità e raccomandazione
6. Se il tipo di incarico lo prevede, compila la **checklist di vigilanza** (template o personalizzata)
7. Genera una **bozza di verbale trimestrale** partendo dal template

### 5.4 Import e mappatura contabile

1. L'utente carica un file (CSV / XLSX / PDF del bilancio di verifica)
2. Il parser locale estrae le voci: codice conto, descrizione, saldo corrente, saldo precedente
3. Il backend invia le voci filtrate (saldo ≠ 0, nome non vuoto) a Gemini con un prompt specializzato contenente le regole del codice civile italiano
4. Gemini restituisce la mappatura civilistica in JSON
5. Il sistema riconcilia la risposta AI con le voci originali, con priorità al layout del PDF sull'output AI
6. Le voci arricchite vengono salvate nel DB e rese disponibili per le carte di lavoro

### 5.5 Generazione di documenti ufficiali

1. Dal dettaglio incarico, il revisore clicca "+ Nuovo documento" nella sezione Bozze
2. Sceglie il tipo (relazione, lettera, verbale)
3. Il sistema genera automaticamente il testo del template con i dati dell'incarico
4. Il revisore apre l'editor, modifica e integra il testo
5. Quando finalizzato, imposta lo stato a `definitivo`

### 5.6 Chiusura dell'incarico

1. Tutti i rilievi critici vengono gestiti o classificati
2. Le carte di lavoro rilevanti sono completate
3. La relazione finale (o verbale) è in stato `definitivo`
4. Il `tenant_owner` o `revisor` imposta l'incarico su `chiuso`

---

## 6. Area Super Admin

Il pannello super admin è separato dall'area tenant e accessibile solo agli utenti con ruolo `super_admin`.

### Funzioni disponibili

| Funzione | Descrizione |
|---|---|
| Dashboard globale | KPI aggregati: tenant, utenti, incarichi, aziende, carte, rilievi |
| Lista tenant | Elenco di tutti gli studi con stato (active / trial / suspended) e piano |
| Dettaglio tenant | Numero incarichi, utenti, piano associato; possibilità di modifica |
| Nuovo tenant | Creazione guidata di un nuovo studio con assegnazione piano |
| Gestione piani | Visualizzazione e modifica dei piani (Small/Medium/Gold) |
| Utenti admin | Lista di tutti gli utenti della piattaforma con ruolo e tenant |

Il super_admin è l'unico ruolo che può:
- modificare `status`, `plan_id` e `plan_expires_at` di un tenant
- creare nuovi tenant e utenti tramite service_role
- accedere a dati di tutti i tenant (bypass RLS)

---

## 7. Autenticazione e sicurezza funzionale

- **Login** tramite email/password con Supabase Auth
- **Reset password** con link via email
- **Account sospeso**: se il tenant è in stato `suspended`, l'utente viene reindirizzato a `/account-sospeso`
- **Onboarding gate**: se `onboarding_completed = false`, l'utente è bloccato a `/onboarding`
- **Profilo disattivato** (`is_active = false`): il middleware effettua il logout automatico
- I super_admin accedono solo a `/admin/*`; gli utenti tenant non possono accedere alle rotte admin

---

## 8. Stato attuale dell'MVP

### Implementato
- Autenticazione completa (login, reset, update password)
- Onboarding tenant
- Dashboard operativa con KPI e rilievi urgenti
- CRUD completo per aziende e incarichi
- Gestione trimestri e carte di lavoro
- Registro rilievi con severità e scadenze
- Centro bozze con template predefiniti
- Import contabile (CSV / XLSX / PDF) con parser locali
- Mappatura AI tramite Gemini (bilancio → schema civilistico)
- Modulo vigilanza con checklist standard
- Gestione utenti tenant
- Impostazioni studio
- Pannello super admin completo (tenant, piani, utenti)

### Non ancora implementato (post-MVP)
- Inbox notifiche avanzata
- Kanban task
- Versioning documentale
- Impersonation tenant
- OCR massivo
- Firma elettronica
- Workflow approvativi multi-step
- Analytics avanzate
- Magic link / SSO
