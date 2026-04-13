# 5. Flussi utente completi dell’MVP

Adesso la parte cruciale: i flussi veri.

---

## Flusso 1 — Primo accesso tenant

### Obiettivo

Portare il cliente da “account attivato” a “prima revisione creata”

### Passi

1. login
2. onboarding base tenant
3. dashboard vuota con CTA
4. crea azienda
5. crea incarico
6. seleziona annualità
7. genera 4 trimestri
8. atterra sulla vista incarico

### Risultato atteso

Tenant pronto a lavorare

---

## Flusso 2 — Creazione nuova revisione

### Obiettivo

Aprire un nuovo incarico in modo semplice

### Passi

1. dashboard o lista aziende
2. clic “nuova revisione”
3. scelta azienda
4. scelta tipo incarico
5. scelta esercizio
6. team assegnato
7. opzione duplica da anno precedente
8. conferma
9. creazione fascicolo annuale + trimestri

### Risultato

Incarico creato e pronto

---

## Flusso 3 — Apertura trimestre operativo

### Obiettivo

Lavorare sul trimestre senza perdersi

### Passi

1. apri incarico
2. vai su trimestri
3. apri Q1/Q2/Q3/Q4
4. overview trimestre
5. sistema mostra documenti mancanti e carte incomplete
6. utente carica documenti
7. utente apre carte collegate
8. eventuali rilievi
9. genera bozza verbale

### Risultato

Trimestre lavorato in modo guidato

---

## Flusso 4 — Upload documenti e collegamento al lavoro

### Obiettivo

Trasformare l’upload in lavoro utile

### Passi

1. apri tab documenti trimestre
2. upload file
3. seleziona categoria
4. collega a trimestre
5. sistema propone tag
6. utente collega a carta
7. documento diventa disponibile in carta e fascicolo
8. opzionale: AI riassunto

### Risultato

Documento non disperso ma contestualizzato

---

## Flusso 5 — Compilazione carta di lavoro

### Obiettivo

Ridurre il lavoro manuale dispersivo

### Passi

1. apri carta
2. vedi documenti collegati
3. compili esiti
4. inserisci note e anomalie
5. salvi bozza
6. chiedi revisione o chiudi
7. opzionale: AI suggerisce commento finale

### Risultato

Carta completata e tracciata

---

## Flusso 6 — Gestione rilievo

### Obiettivo

Trasformare una criticità in item tracciato

### Passi

1. da carta o trimestre clic “crea rilievo”
2. compili titolo, area, gravità, descrizione
3. colleghi documenti/carte
4. assegni follow-up
5. il rilievo compare nel registro
6. lo colleghi al verbale se necessario
7. chiusura quando risolto

### Risultato

Criticità non dimenticata

---

## Flusso 7 — Generazione bozza verbale trimestrale

### Obiettivo

Usare AI in modo utile e non costoso

### Passi

1. apri tab verbale
2. clic “genera bozza”
3. sistema raccoglie:
    - dati trimestre
    - esiti carte
    - rilievi
    - note
4. genera bozza
5. utente revisiona
6. rigenera solo sezioni se necessario
7. approva finale
8. esporta

### Risultato

Output professionale ma controllato

---

## Flusso 8 — Modulo vigilanza / collegio

### Obiettivo

Gestire anche il lavoro sindacale

### Passi

1. apri area vigilanza
2. nuova verifica o verbale
3. compili checklist
4. inserisci osservazioni
5. eventuali rilievi
6. genera bozza verbale
7. revisione
8. esportazione finale

### Risultato

Funzione differenziante rispetto a software più deboli sul tema

---

## Flusso 9 — Import contabile e confronto anno precedente

### Obiettivo

Velocizzare analisi ripetitive

### Passi

1. apri import contabile
2. carichi Excel/CSV/XBRL
3. sistema riconosce struttura
4. mapping conti
5. salvi mapping
6. dati disponibili nelle analisi
7. vai a schermata confronto anno precedente
8. vedi scostamenti
9. opzionale: AI suggerisce commenti su variazioni

### Risultato

Grande valore percepito dal cliente

---

## Flusso 10 — Chiusura trimestre

### Obiettivo

Dare uno stato formale al trimestre

### Passi

1. overview trimestre
2. verifica carte completate
3. verifica documenti obbligatori
4. verifica bozza verbale approvata
5. verifica rilievi aperti o riportati
6. clic “chiudi trimestre”
7. sistema registra chiusura e blocca stato salvo permessi

### Risultato

Trimestre chiuso formalmente

---

## Flusso 11 — Chiusura annualità / Q4 finale

### Obiettivo

Concludere l’incarico annuale

### Passi

1. apri Q4
2. completa verifiche finali
3. riepilogo annuale
4. relazione finale base
5. approvazione
6. chiusura annualità
7. aggiornamento consumo revisione del piano

### Risultato

Incarico concluso

---

## Flusso 12 — Gestione piano licenza lato tenant

### Obiettivo

Far capire chiaramente i limiti

### Passi

1. tenant apre “Piano e utilizzo”
2. vede incarichi usati
3. vede trimestri completati
4. vede eventuale saturazione
5. richiede upgrade

### Risultato

Minore confusione commerciale

---

## Flusso 13 — Flusso super admin attivazione cliente

### Obiettivo

Attivare un nuovo tenant

### Passi

1. super admin crea tenant
2. assegna piano
3. attiva moduli
4. definisce scadenza
5. invia accesso
6. tenant entra e inizia onboarding

---

## Flusso 14 — Flusso super admin modifica licenza

### Obiettivo

Gestire commerciale e supporto

### Passi

1. apri dettaglio tenant
2. tab licenza
3. cambia piano o sblocca opzioni
4. sistema aggiorna limiti
5. tenant vede subito stato aggiornato

---

# 6. Regole di navigazione fondamentali

Per far funzionare bene il software, ci sono regole UX che devi rispettare.

## Regola 1

Da ogni schermata importante deve esserci sempre un **prossimo passo chiaro**.

Esempio:

- se mancano documenti → bottone “carica documenti”
- se mancano carte → bottone “apri carte incomplete”
- se tutto è pronto → bottone “genera bozza”

## Regola 2

Mai mostrare all’utente tutto insieme.  
Serve progressive disclosure:

- overview prima
- dettaglio dopo
- editor solo quando serve

## Regola 3

Lo stato deve essere sempre visibile:

- incarico
- trimestre
- carta
- rilievo
- bozza

## Regola 4

Le azioni AI devono essere sempre:

- facoltative
- contestuali
- chiare
- limitate