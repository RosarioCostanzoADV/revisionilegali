# AI USAGE PROTOCOL
## SaaS Revisione Legale & Collegio Sindacale

---

## 🎯 Scopo del documento
Questo documento definisce **quando e come usare i modelli AI** durante lo sviluppo del SaaS.

Obiettivo:
- evitare errori
- ridurre bug
- mantenere coerenza del codice
- ottimizzare costi e tempo

---

## 🧠 MODEL OWNER PRINCIPALE

👉 **Claude Sonnet 4.6 = modello principale di sviluppo**

Regola assoluta:
- tutto il codice core viene scritto da Sonnet
- mantiene coerenza del progetto

---

## ⚙️ RUOLI DEI MODELLI

### 🟢 Claude Sonnet 4.6 → SVILUPPATORE PRINCIPALE
Usare quando:
- creazione moduli
- CRUD
- UI
- integrazione Supabase
- API
- logica applicativa standard
- bug fixing normale

👉 DEFAULT MODEL

---

### 🟡 Claude Opus 4.6 → ARCHITETTO / DEBUG AVANZATO
Usare quando:
- multi-tenant
- RLS (Row Level Security)
- autenticazione
- gestione piani (Small / Medium / Gold)
- sicurezza
- refactor complessi
- bug difficili

👉 NON usare per sviluppo normale

---

### 🔵 Gemini 3 Flash → TASK VELOCI
Usare quando:
- riassunti
- trasformazione testi
- documentazione
- copy tecnico
- esempi veloci

👉 NON usare per codice core

---

### 🟣 Gemini 3.1 Pro High → ANALISI STRATEGICA
Usare quando:
- confronto architetture
- analisi documenti lunghi
- decisioni progettuali
- valutazioni tecniche complesse

👉 NON usare per coding operativo

---

## 🔥 MATRICE DECISIONALE

| Task | Modello |
|------|--------|
| Creare modulo | Sonnet |
| CRUD | Sonnet |
| UI | Sonnet |
| Bug semplice | Sonnet |
| Bug complesso | Opus |
| Auth / sicurezza | Opus |
| Multi-tenant | Opus |
| Riassunto testo | Gemini Flash |
| Analisi lunga | Gemini Pro High |
| Strategia | Gemini Pro High |

---

## 🚨 REGOLE FONDAMENTALI

### ❗ Regola 1
**Stesso modulo = stesso modello**

---

### ❗ Regola 2
Gemini NON deve toccare:
- database schema
- auth
- RLS
- multi-tenant
- logica licenze
- workflow core

---

### ❗ Regola 3
Opus NON sviluppa tutto
→ interviene solo su parti critiche

---

### ❗ Regola 4
Ogni task deve specificare:
- cosa fare
- cosa NON toccare
- file coinvolti
- risultato atteso

---

### ❗ Regola 5
Test immediato dopo ogni modifica

---

## 🧠 AI ROUTER (OBBLIGATORIO)

Prima di ogni task importante usare questo prompt:

---

## ⚙️ PROMPT STANDARD DI SVILUPPO

Usare sempre questa struttura:

---

## 🚀 WORKFLOW OPERATIVO

1. Definisci task
2. Usa AI Router
3. Usa modello consigliato
4. Test immediato
5. Commit su GitHub
6. (Se necessario) review con Opus

---

## ⚠️ ERRORI DA EVITARE

❌ Cambiare modello continuamente  
❌ Usare Opus per tutto  
❌ Usare Gemini per codice core  
❌ Non testare subito  
❌ Fare modifiche massive senza controllo  

---

## 🎯 REGOLA D’ORO

👉 Sonnet costruisce  
👉 Opus controlla  
👉 Gemini assiste  

---

## 📌 NOTE FINALI

Questo protocollo è obbligatorio per:
- mantenere qualità
- ridurre bug
- sviluppare più velocemente

Ogni deviazione aumenta il rischio di errori.

---
---

## 🧪 Test ambiente

✔ Collegamento Obsidian attivo  
✔ File sincronizzato con repository  
✔ Modifiche tracciate via Git  



## 🌐 STRATEGIA RUNTIME AI & LOGICA (STEP 1 & 3)

### Protocollo Import Bilancio (Efficienza Token)
1. **Fase 1 (Zero Token)**: Il backend usa librerie locali (es. pdf-parse) per estrarre il testo grezzo dal PDF.
2. **Fase 2 (Filtro)**: Uno script pulisce il testo cercando solo keyword contabili (Attivo, Ricavi, ecc.).
3. **Fase 3 (Mapping AI)**: Si invia a Gemini 1.5 Flash SOLO il testo filtrato.
   - *Prompt*: "Mappa queste voci in JSON {voce_standard: valore}. Sii sintetico."
4. **Fase 4 (Database)**: Il JSON viene salvato su Supabase per evitare chiamate duplicate.

### Protocollo Campionamento (Deterministic Logic)
- **REGOLA FISSA**: Il campionamento NON è generato dall'AI.
- **Sviluppo**: Claude Sonnet deve scrivere funzioni TypeScript/Python pure che applicano le formule ISA Italia.
- **Ruolo AI**: L'AI interviene solo alla fine per generare il "Commento Professionale" ai risultati del campione basandosi sui rischi rilevati.

### UX Architecture (Anti-Macchinosità)
- Ogni modulo deve rispettare la regola dei **"3 Clic"**: l'utente deve poter arrivare dalla Dashboard Annuale a qualsiasi carta di lavoro trimestrale in massimo 3 clic.