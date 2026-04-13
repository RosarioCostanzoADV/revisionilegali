# 1. Obiettivo UX dell’MVP

L’MVP non deve sembrare un gestionale pesante.  
Deve sembrare un software che dice al revisore:

**“So dove sei, cosa devi fare adesso, quali documenti mancano, quali carte sono incomplete e quale bozza puoi già generare.”**

Quindi la UX deve avere 5 caratteristiche:

1. **orientata al flusso**, non al menu infinito
2. **trimestre-centrica**, perché il tuo modello di utilizzo ruota sui 4 trimestri
3. **fascicolo-centrica**, perché tutto deve ricondurre a documenti, carte, rilievi, bozze
4. **stato-centrica**, cioè ogni area deve avere uno stato chiaro
5. **azione-centrica**, cioè ogni schermata deve spingere l’utente al prossimo passo utile

# 2. Architettura generale delle aree del software

Il prodotto va diviso in **2 macro-sistemi**:

## A. Area Tenant Cliente

È l’area usata da:

- titolare studio
- revisore
- collaboratore
- sindaco / membro collegio

Qui si svolge il lavoro operativo.

## B. Area Super Admin

È l’area tua, dove gestisci:

- clienti
- licenze
- limiti piani
- moduli attivi
- consumo AI
- stato tenant
- supporto interno


# 7. Schermate prioritarie MVP 1.0 vs post-MVP

## Da sviluppare subito nel MVP 1.0

Queste sono indispensabili:

- Login
- Dashboard tenant
- Lista aziende
- Nuova azienda
- Scheda azienda
- Lista incarichi
- Nuovo incarico
- Dettaglio incarico
- Vista trimestri
- Dettaglio trimestre
- Tab documenti trimestre
- Tab carte trimestre
- Carta di lavoro singola
- Registro rilievi
- Dettaglio rilievo
- Centro bozze
- Editor bozza
- Import contabile
- Mapping conti
- Confronto anno precedente
- Dashboard vigilanza
- Verbale vigilanza
- Gestione utenti tenant
- Impostazioni tenant
- Dashboard super admin
- Lista tenant
- Dettaglio tenant
- Gestione piani
- Monitoraggio AI

## Da lasciare per v1.1 o v2

- inbox notifiche avanzata
- kanban task sofisticato
- versioning documentale avanzato
- impersonation tenant
- OCR massivo
- firma elettronica
- workflow approvativi multi-step
- analytics avanzate

---

# 8. Ordine corretto di progettazione UI per Claude Code

Quando inizierai a sviluppare, non fare tutte le schermate insieme.

## Ordine giusto

1. login + onboarding
2. dashboard tenant
3. aziende + incarichi
4. trimestri
5. documenti
6. carte di lavoro
7. rilievi
8. bozze e editor
9. vigilanza
10. import contabile
11. settings tenant
12. super admin

Questo ordine è corretto perché segue il flusso di utilizzo reale.

---

# 9. Mia valutazione finale sulla mappa

La struttura giusta per il tuo MVP è questa:

**Tenant centrato su incarico → trimestre → documenti/carte/rilievi → bozza → chiusura**

e in parallelo:

**Super admin centrato su tenant → piano → limiti → moduli → utilizzo**

Questo è il disegno corretto per un SaaS come il tuo.  
È abbastanza ampio da essere professionale, ma ancora abbastanza controllato da poter essere sviluppato a fasi con Claude Code in Antigravity senza trasformarsi in un mostro ingestibile.

Il prossimo passo giusto è trasformare tutto questo in una struttura ancora più operativa:

**una tabella schermata-per-schermata con: nome, scopo, ruolo che la vede, componenti UI, azioni, dati richiesti, dipendenze backend e priorità MVP**.