3.1. Autenticazione e accesso

### Schermata 1 — Login

**Scopo:** accesso account tenant

**Elementi:**

- email
- password
- “ricordami”
- recupera password
- logo prodotto
- eventuale sottotitolo piano attivo

**Azioni:**

- login
- reset password
- accesso tramite magic link opzionale in futuro, non MVP

**Note UX:**

- semplice
- niente distrazioni
- eventuale messaggio stato tenant sospeso

---

### Schermata 2 — Password dimenticata

**Scopo:** recupero accesso

**Elementi:**

- campo email
- invia link reset
- torna al login

---

### Schermata 3 — Primo accesso / onboarding base tenant

Questa schermata appare solo la prima volta.

**Scopo:** raccogliere dati minimi per avvio account

**Campi:**

- nome studio / revisore
- nome referente
- telefono
- partita IVA o codice fiscale studio
- logo facoltativo
- timezone
- preferenze documenti base

**Azioni:**

- salva profilo
- vai alla dashboard

---

## 3.2. Dashboard principale tenant

### Schermata 4 — Dashboard Home

Questa è una delle schermate più importanti del prodotto.

**Scopo:** far capire in 10 secondi cosa succede nel tenant

## Blocchi principali

### Blocco A — KPI rapidi

Mostra:

- incarichi attivi
- trimestri in corso
- carte incomplete
- documenti mancanti
- rilievi aperti
- bozze da validare

### Blocco B — Revisioni recenti

Lista ultime revisioni toccate con:

- nome azienda
- esercizio
- trimestre corrente
- stato avanzamento
- ultima attività

### Blocco C — Scadenze imminenti

Mostra:

- verifiche trimestrali vicine
- verbali da chiudere
- relazioni in bozza
- richieste documenti ancora aperte

### Blocco D — Attività mie

Per utente loggato:

- task assegnati
- carte da completare
- bozze da revisionare

### Blocco E — Stato licenza

Molto utile lato business.  
Mostra:

- piano attivo
- revisioni disponibili / consumate
- utenti inclusi / usati
- eventuale stato modulo vigilanza
- eventuale quota AI disponibile

### Blocco F — Accessi rapidi

Bottoni:

- nuova revisione
- apri trimestre
- carica documenti
- genera bozza verbale
- vedi rilievi aperti

**Obiettivo UX:** la dashboard non deve essere “bella”, deve essere “operativa”.

---

## 3.3. Anagrafiche e aziende

### Schermata 5 — Lista Aziende / Clienti revisionati

**Scopo:** vedere tutte le aziende gestite nel tenant

**Colonne:**

- ragione sociale
- tipo incarico
- esercizio attivo
- stato
- prossimo trimestre
- revisore responsabile
- ultimo aggiornamento

**Filtri:**

- attive / archiviate
- revisione
- collegio sindacale
- sindaco unico
- revisione + vigilanza
- esercizio
- responsabile

**Azioni per riga:**

- apri scheda azienda
- modifica
- archivia
- duplica nuova annualità

**Azioni globali:**

- nuova azienda
- importa aziende
- cerca

---

### Schermata 6 — Nuova Azienda / Nuovo Cliente

**Scopo:** creare anagrafica azienda

**Sezioni campi:**

#### Sezione A — Dati anagrafici

- ragione sociale
- forma giuridica
- P.IVA / CF
- sede
- email
- PEC
- telefono
- settore
- codice ATECO facoltativo

#### Sezione B — Dati revisione

- tipo incarico
- data inizio incarico
- esercizio
- periodicità trimestrale già preimpostata
- team assegnato
- revisore responsabile

#### Sezione C — Impostazioni fascicolo

- crea fascicolo annuale
- crea 4 trimestri
- importa struttura anno precedente
- abilita vigilanza se prevista

**Azioni:**

- salva e apri scheda
- salva e crea altro
- annulla

---

### Schermata 7 — Scheda Azienda

È la scheda “master” dell’azienda.

**Tabs consigliati:**

- Overview
- Incarichi
- Annualità
- Documenti
- Team
- Rilievi
- Storico
- Impostazioni

---

### Tab Overview

Mostra:

- dati azienda
- incarico attivo
- stato trimestri
- ultimi documenti caricati
- bozze recenti
- alert aperti

### Tab Incarichi

Lista incarichi associati con:

- revisione legale
- sindaco unico
- collegio
- vigilanza

### Tab Annualità

Mostra:

- annualità create
- stato per anno
- accesso rapido ai trimestri
- possibilità di duplicare da anno precedente

### Tab Documenti

Vista documentale trasversale azienda

### Tab Team

Utenti associati a quella azienda

### Tab Rilievi

Lista criticità aperte/chiuse

### Tab Storico

Attività cronologiche

### Tab Impostazioni

Configurazioni specifiche azienda:

- naming documenti
- template verbali
- mapping conti preferito
- note permanenti

---

## 3.4. Incarichi e annualità

### Schermata 8 — Lista Incarichi

**Scopo:** vista per incarico, non per azienda

Utile per utenti che ragionano su revisione attiva.

**Colonne:**

- azienda
- tipo incarico
- annualità
- trimestre corrente
- stato
- responsabile
- completamento percentuale

**Filtri:**

- mio / team
- tipo incarico
- trimestre
- stato
- con rilievi
- con bozze in sospeso

---

### Schermata 9 — Creazione Nuovo Incarico

Questa può partire:

- dalla dashboard
- dalla scheda azienda
- da lista incarichi

**Campi:**

- azienda
- tipo incarico
- esercizio
- data inizio
- team assegnato
- attiva vigilanza sì/no
- crea trimestri automatici sì/no
- duplica da anno precedente sì/no

**Azioni:**

- crea incarico
- crea e vai al trimestre 1

---

### Schermata 10 — Dettaglio Incarico

Questa è una schermata centrale.

**Header con dati sintetici:**

- azienda
- annualità
- tipo incarico
- responsabile
- piano licenza impattato
- stato globale incarico

**Widget principali:**

- percentuale completamento
- documenti caricati
- carte compilate
- rilievi aperti
- bozze generate
- trimestre attivo

**Tabs:**

- Overview
- Trimestri
- Fascicolo annuale
- Carte di lavoro
- Rilievi
- Bozze e relazioni
- Team
- Attività log

---

## 3.5. Trimestri

### Schermata 11 — Vista Trimestri dell’Incarico

Questa schermata deve essere molto chiara.

**Layout consigliato:** 4 card o timeline

- Q1
- Q2
- Q3
- Q4

Per ogni trimestre mostra:

- stato
- data prevista
- documenti caricati
- carte completate
- rilievi aperti
- bozza verbale presente sì/no

**Stati possibili:**

- non avviato
- in raccolta documenti
- in lavorazione
- in revisione
- chiuso

**Azioni per trimestre:**

- apri trimestre
- genera bozza
- duplica dati dal precedente
- chiudi trimestre

---

### Schermata 12 — Dettaglio Trimestre

Questa è una delle schermate più usate.

**Header:**

- azienda
- incarico
- trimestre
- stato
- completamento
- prossima scadenza

**Sezioni o tabs:**

- Overview
- Documenti
- Carte
- Rilievi
- Verbale / Bozza
- Task
- Timeline attività

---

### Tab Overview Trimestre

Mostra:

- checklist rapida
- documenti mancanti
- carte aperte
- rilievi aperti
- pulsanti azione

**Azioni rapide:**

- carica documenti
- apri carte incomplete
- genera verbale bozza
- crea rilievo
- chiudi trimestre

---

### Tab Documenti Trimestre

**Scopo:** raccogliere i documenti del trimestre

**Vista:**  
tabella con:

- nome documento
- categoria
- data caricamento
- stato revisione
- collegato a carta sì/no
- uploader

**Categorie standard MVP:**

- bilancio infrannuale
- prima nota / contabilità
- mastri
- verbali CDA
- estratti bancari
- situazione debiti/crediti
- documenti fiscali
- altro

**Azioni:**

- upload documento
- tagga
- collega a carta
- segna verificato
- scarica
- elimina se permesso

**Funzione AI opzionale on demand:**

- riassumi documento
- estrai punti chiave

---

### Tab Carte Trimestre

Qui vedi le carte rilevanti per quel trimestre.

**Colonne:**

- nome carta
- area
- stato
- assegnatario
- ultima modifica
- presenza note
- necessita revisione sì/no

**Azioni:**

- apri carta
- duplica
- assegna
- chiudi
- commenta

---

### Tab Rilievi Trimestre

Lista di criticità/osservazioni

**Campi:**

- titolo rilievo
- severità
- area
- stato
- assegnato a
- data apertura
- data chiusura
- collegato a verbale sì/no

---

### Tab Verbale / Bozza

Qui sta il cuore dell’automazione AI percepita.

**Elementi:**

- bozza verbale attuale
- cronologia versioni
- stato: generata / revisionata / approvata
- note redazionali
- eventuali sezioni evidenziate da completare

**Azioni:**

- genera bozza
- rigenera sezione
- modifica manualmente
- esporta PDF
- esporta DOCX
- approva versione finale

---

### Tab Task

Lista task del trimestre:

- raccogli documento X
- verificare area crediti
- completare carta rischi
- rivedere bozza verbale

---

### Tab Timeline Attività

Cronologia:

- upload file
- modifica carte
- generazione bozza
- apertura rilievo
- chiusura trimestre

---

## 3.6. Fascicolo documentale

### Schermata 13 — Fascicolo Annuale

Questa schermata contiene tutto il materiale dell’annualità.

**Sezioni standard:**

- fascicolo permanente
- fascicolo annuale
- Q1
- Q2
- Q3
- Q4
- relazioni finali
- allegati

**Vista ideale:**  
colonna sinistra = struttura cartelle  
colonna destra = contenuti della sezione

**Azioni:**

- crea cartella
- upload
- rinomina
- tag
- collega a carta
- collega a trimestre
- segnala documento chiave

---

### Schermata 14 — Documento singolo

Quando clicchi un documento si apre la sua scheda.

**Elementi:**

- anteprima
- metadati
- categoria
- trimestre associato
- carte collegate
- rilievi collegati
- note
- log utilizzo

**Azioni:**

- modifica metadati
- collega ad altre carte
- lancia AI riassunto
- scarica
- sostituisci versione

---

## 3.7. Carte di lavoro

### Schermata 15 — Libreria Carte di Lavoro dell’Incarico

**Scopo:** vedere tutte le carte, non solo quelle trimestrali

**Raggruppamenti:**

- accettazione incarico
- indipendenza
- pianificazione
- rischi
- materialità
- procedure periodiche
- conclusioni
- relazione finale
- vigilanza

**Filtri:**

- aperte
- da rivedere
- chiuse
- assegnate a me
- per trimestre
- per area

---

### Schermata 16 — Carta di lavoro singola

Una delle schermate più importanti dell’MVP.

**Header:**

- nome carta
- area
- stato
- assegnatario
- trimestre/annualità
- ultima modifica

**Layout consigliato a 3 colonne o 2 sezioni forti:**

### Sezione A — Contenuto carta

Campi strutturati:

- obiettivo
- dati base
- controlli svolti
- esiti
- anomalie
- conclusioni
- note finali

### Sezione B — Documenti collegati

Lista documenti allegati

### Sezione C — Commenti e revisione

- note team
- richieste revisione
- approvazione

**Azioni:**

- salva bozza
- segna completa
- richiedi revisione
- approva
- esporta
- genera suggerimento AI su commento/conclusione

**Uso AI corretto qui:**

- suggerisci sintesi conclusiva
- proponi commento professionale
- non fare completamento totale automatico senza controllo utente

---

## 3.8. Modulo vigilanza / collegio sindacale / sindaco unico

### Schermata 17 — Dashboard Vigilanza

Questa area è distinta ma collegata all’incarico.

**Blocchi:**

- prossime verifiche
- verbali da generare
- assetti da verificare
- rilievi aperti
- storico ultime riunioni

---

### Schermata 18 — Lista Verbali Vigilanza

**Colonne:**

- data verifica
- trimestre
- stato verbale
- responsabile
- rilievi presenti
- esportato sì/no

**Azioni:**

- nuovo verbale
- apri verbale
- genera bozza
- esporta

---

### Schermata 19 — Verbale Vigilanza / Collegio

**Sezioni:**

- dati riunione
- partecipanti
- ordine del giorno
- verifiche svolte
- osservazioni
- assetti organizzativi
- assetti amministrativi
- assetti contabili
- eventuali rilievi
- conclusioni

**Azioni:**

- salva
- genera bozza con AI da dati raccolti
- esporta
- approva finale

---

### Schermata 20 — Checklist Vigilanza

**Scopo:** supportare compilazione periodica

**Aree:**

- assetti organizzativi
- continuità aziendale
- rispetto legge/statuto
- assetto amministrativo
- assetto contabile
- rapporti con amministratori
- eventi significativi

**Azioni:**

- compila
- salva
- collega al verbale
- genera osservazioni suggerite

---

## 3.9. Rilievi e criticità

### Schermata 21 — Registro Rilievi

Schermata trasversale molto utile.

**Colonne:**

- azienda
- incarico
- trimestre
- titolo
- gravità
- stato
- assegnato
- collegato a verbale
- collegato a relazione finale

**Filtri:**

- aperti
- chiusi
- critici
- per area
- per azienda
- per assegnatario

---

### Schermata 22 — Dettaglio Rilievo

**Campi:**

- titolo
- descrizione
- area
- gravità
- origine
- documenti collegati
- carte collegate
- stato
- assegnatario
- azioni correttive
- follow-up
- esito finale

**Azioni:**

- aggiorna stato
- collega a verbale
- collega a bozza finale
- chiudi

---

## 3.10. Bozze, relazioni, output

### Schermata 23 — Centro Bozze e Relazioni

Questa schermata raccoglie tutti gli output generati.

**Tipologie:**

- verbali trimestrali
- verbali vigilanza
- note interne
- relazioni finali
- riepiloghi anno precedente
- bozze commenti

**Colonne:**

- tipo documento
- azienda
- trimestre / annualità
- stato
- ultima versione
- creato da
- approvato da

**Azioni:**

- apri
- modifica
- duplica
- esporta
- archivia

---

### Schermata 24 — Editor Bozza / Relazione

Editor controllato, non troppo libero.

**Struttura:**

- template a blocchi
- contenuto testuale
- variabili inserite
- note laterali
- storico versioni

**Azioni:**

- salva
- genera da template
- rigenera sezione con AI
- accetta revisione
- approva finale
- esporta PDF / Word

---

## 3.11. Import contabile

### Schermata 25 — Import Data Room / Contabilità

Qui l’utente carica i dati contabili.

**Tipi import:**

- Excel
- CSV
- XBRL
- documenti vari

**Passi wizard:**

1. selezione file
2. riconoscimento tipo
3. mapping campi
4. anteprima dati
5. conferma import
6. eventuale suggerimento AI mapping conti

---

### Schermata 26 — Mapping Piano dei Conti

**Scopo:** classificare e riutilizzare nel tempo

**Colonne:**

- conto sorgente
- descrizione
- categoria proposta
- categoria confermata
- stato mapping
- origine suggerimento

**Azioni:**

- accetta suggerimento
- modifica mapping
- salva template mapping
- applica a import futuri

Questa schermata è chiave per far percepire velocità al cliente.

---

### Schermata 27 — Confronto Anno Precedente

**Scopo:** confronto numerico + commento operativo

**Blocchi:**

- saldi anno corrente
- saldi anno precedente
- differenza assoluta
- differenza %
- flag scostamento rilevante
- commento utente
- suggerimento AI commento

**Azioni:**

- esporta confronto
- genera sintesi
- collega a carte di lavoro

---

## 3.12. Task e collaborazione

### Schermata 28 — Task Board

**Scopo:** lavorare in team

**Viste:**

- lista
- kanban semplice
- per trimestre
- per assegnatario

**Task fields:**

- titolo
- descrizione
- priorità
- assegnato
- scadenza
- incarico
- trimestre
- stato

---

### Schermata 29 — Notifiche / Inbox interna

**Tipi notifiche:**

- documento caricato
- carta da revisionare
- bozza generata
- rilievo assegnato
- trimestre vicino alla chiusura
- licenza quasi esaurita

---

## 3.13. Team e utenti tenant

### Schermata 30 — Gestione Utenti Tenant

**Colonne:**

- nome
- email
- ruolo
- aziende assegnate
- ultimo accesso
- stato

**Azioni:**

- invita utente
- cambia ruolo
- disattiva
- reset password
- assegna aziende/incarichi

---

### Schermata 31 — Profilo Utente

**Campi:**

- dati personali
- firma
- ruolo
- preferenze
- notifiche
- modelli di output predefiniti

---

## 3.14. Impostazioni tenant

### Schermata 32 — Impostazioni Studio / Tenant

**Sezioni:**

- dati studio
- branding base
- template documenti
- preferenze naming file
- moduli attivi
- loghi
- intestazioni documenti
- settaggi notifiche
- uso AI consentito

---

### Schermata 33 — Piano e Utilizzo

Molto importante anche commercialmente.

**Mostra:**

- piano attivo
- incarichi disponibili / usati
- trimestri completati
- utenti inclusi / usati
- storage usato
- AI usage se prevista

**Azioni:**

- richiedi upgrade
- contatta supporto
  
  # 4. Mappa completa schermate — Area Super Admin

Ora passiamo alla tua area.

## 4.1. Dashboard Super Admin

### Schermata SA1 — Dashboard Super Admin

**Blocchi principali:**

- tenant attivi
- tenant sospesi
- piani Small/Medium/Gold attivi
- revisioni consumate globali
- utilizzo AI globale
- storage globale
- ticket supporto
- ultimi tenant creati

---

## 4.2. Tenant management

### Schermata SA2 — Lista Tenant

**Colonne:**

- nome tenant
- referente
- piano
- stato
- utenti attivi
- incarichi usati
- storage usato
- AI usage
- scadenza licenza

**Azioni:**

- apri tenant
- sospendi
- riattiva
- modifica piano
- modifica moduli
- impersona tenant in futuro, non MVP se vuoi evitarlo inizialmente

---

### Schermata SA3 — Dettaglio Tenant

**Tabs:**

- overview
- licenza
- moduli
- utenti
- utilizzo
- log attività
- supporto interno

### Tab Overview

dati sintetici tenant

### Tab Licenza

- piano
- data attivazione
- scadenza
- incarichi inclusi
- incarichi usati
- trimestri completati
- stato rinnovo

### Tab Moduli

- revisione legale attiva sì/no
- vigilanza attiva sì/no
- AI bozze sì/no
- import avanzato sì/no

### Tab Utenti

utenti del tenant

### Tab Utilizzo

- documenti caricati
- storage
- AI usage
- revisioni consumate

### Tab Log

azioni principali

### Tab Supporto interno

note tue su cliente

---

## 4.3. Piani e licenze

### Schermata SA4 — Gestione Piani

**Scopo:** configurare Small / Medium / Gold

**Campi per piano:**

- nome piano
- numero incarichi annui
- trimestri per incarico
- utenti inclusi
- storage incluso
- AI quota
- moduli inclusi
- stato attivo/inattivo

---

### Schermata SA5 — Attivazione / modifica licenza tenant

**Azioni:**

- assegna piano
- cambia piano
- aggiungi incarico extra
- aggiungi utente extra
- sospendi AI
- estendi scadenza
- sblocca revisione extra

---

## 4.4. Monitoraggio AI e cost control

### Schermata SA6 — Monitoraggio Consumo AI

Fondamentale per te.

**Colonne / metriche:**

- tenant
- modello usato
- numero chiamate
- token input stimati
- token output stimati
- costo stimato
- feature AI utilizzata
- data ultima attività

**Filtri:**

- per tenant
- per modello
- per feature
- per periodo

---

## 4.5. Audit e controllo sistema

### Schermata SA7 — Audit Log globale

**Scopo:** vedere azioni sensibili

**Eventi importanti:**

- creazione tenant
- cambio piano
- modifica permessi
- sospensione account
- generazione bozze AI
- eliminazione documenti
- chiusura trimestre
- modifica relazioni finali

---

## 4.6. Supporto e note interne

### Schermata SA8 — CRM interno tenant

**Campi:**

- note commerciali
- problemi aperti
- richieste cliente
- data ultimo contatto
- priorità supporto