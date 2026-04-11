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
