export interface AuditArea {
  key: string;
  label: string;
  keywords: string[];
  procedures: string[];
}

export const AUDIT_AREAS: AuditArea[] = [
  {
    key: "fondi_ammortamento",
    label: "Fondi di Ammortamento",
    keywords: [
      "f.do amm", "f.do ammort", "fondo ammort", "fondo amm.to",
      "fondi ammortamento", "f.di ammortamento",
    ],
    procedures: [
      "□ Verificare la corretta applicazione delle aliquote di ammortamento per categoria di cespite",
      "□ Riconciliare i fondi con il registro cespiti (valore storico − valore residuo)",
      "□ Controllare gli utilizzi del fondo per dismissioni/cessioni dell'esercizio",
      "□ Verificare la coerenza tra fondi e voci di attivo corrispondenti",
    ],
  },
  {
    key: "immobilizzazioni",
    label: "Immobilizzazioni",
    keywords: [
      "immobilizzaz", "attrezzatur", "macchinari", "fabbricat", "terreni",
      "avviamento", "brevett", "marchi", "software", "licenze", "concessioni",
      "impianti", "impianto", "cespiti", "costruzioni", "mobili", "arredi", "veicoli",
      "automezzi", "autoveicoli", "leasing finanziario", "beni in leasing",
      "costi di impianto", "costi d'impianto", "costi d impianto",
      "beni immateriali", "diritti brevett", "diritti utenza",
    ],
    procedures: [
      "□ Verificare l'esistenza fisica dei cespiti principali tramite ispezione",
      "□ Riconciliare il registro cespiti con i saldi contabili",
      "□ Verificare la corretta applicazione delle aliquote di ammortamento",
      "□ Controllare acquisizioni e dismissioni dell'esercizio e relativa documentazione",
      "□ Verificare la congruità delle svalutazioni o rivalutazioni effettuate",
      "□ Controllare eventuali ipoteche o vincoli sui beni immobili",
      "□ Verificare i contratti di leasing e la corretta contabilizzazione",
    ],
  },
  {
    key: "rimanenze",
    label: "Rimanenze di Magazzino",
    keywords: [
      "rimanenz", "magazzino", "merci", "prodotti finiti", "semilavorati",
      "materie prime", "materiali", "giacenze", "scorte", "lavori in corso",
      "commesse", "prodotti in corso",
    ],
    procedures: [
      "□ Partecipare o verificare l'inventario fisico di fine periodo",
      "□ Riconciliare le distinte di inventario con i saldi contabili",
      "□ Verificare la corretta valutazione (LIFO/FIFO/costo medio)",
      "□ Controllare le obsolescenze e la congruità del fondo svalutazione",
      "□ Verificare le rimanenze detenute presso terzi o in conto lavoro",
      "□ Controllare il cut-off delle ultime movimentazioni di magazzino",
    ],
  },
  {
    key: "crediti",
    label: "Crediti verso Clienti",
    keywords: [
      "crediti verso clienti", "crediti clienti", "fatture da emettere",
      "effetti attivi", "ricevute bancarie", "crediti commerciali",
      "crediti vs clienti", "crediti v/clienti",
    ],
    procedures: [
      "□ Effettuare la circolarizzazione dei crediti di importo significativo",
      "□ Analizzare l'aging dei crediti e identificare le posizioni scadute",
      "□ Valutare la congruità del fondo svalutazione crediti",
      "□ Verificare i crediti ceduti o dati in factoring",
      "□ Controllare note di credito emesse dopo la chiusura del periodo",
      "□ Verificare il cut-off delle ultime fatture emesse",
      "□ Controllare crediti verso parti correlate e condizioni applicate",
    ],
  },
  {
    key: "altri_crediti",
    label: "Altri Crediti e Attività",
    keywords: [
      "crediti tributari", "credito iva", "crediti verso erario", "imposte anticipate",
      "crediti diversi", "crediti verso altri", "acconti", "depositi cauzionali",
      "crediti verso soci", "crediti vs soci", "ratei attivi", "risconti attivi",
    ],
    procedures: [
      "□ Verificare la recuperabilità dei crediti tributari",
      "□ Controllare la corretta determinazione delle imposte anticipate (FTA)",
      "□ Verificare i depositi cauzionali e la relativa documentazione",
      "□ Controllare la competenza di ratei e risconti attivi",
      "□ Verificare i crediti verso soci per eventuali finanziamenti soci",
    ],
  },
  {
    key: "liquidita",
    label: "Disponibilità Liquide",
    keywords: [
      "cassa", "banca", "c/c", "conto corrente", "depositi bancari",
      "disponibilità liquide", "assegni", "valori bollati", "denaro",
      "banche c/c", "istituti di credito",
    ],
    procedures: [
      "□ Riconciliare tutti i conti bancari con gli estratti conto bancari",
      "□ Verificare le riconciliazioni bancarie a fine periodo",
      "□ Controllare i movimenti di cassa e verificare la giacenza fisica",
      "□ Verificare eventuali conti vincolati, dati in pegno o indisponibili",
      "□ Controllare i bonifici in transito a fine periodo",
      "□ Verificare l'esistenza di conti correnti non registrati in contabilità",
    ],
  },
  {
    key: "patrimonio_netto",
    label: "Patrimonio Netto",
    keywords: [
      "capitale sociale", "riserva legale", "riserva straordinaria", "riserve",
      "utile", "perdita", "patrimonio netto", "sovrapprezzo azioni",
      "versamenti soci", "utili portati a nuovo", "perdite portate a nuovo",
      "riserva da rivalutazione",
    ],
    procedures: [
      "□ Verificare le variazioni del capitale sociale e la documentazione assembleare",
      "□ Controllare la corretta destinazione dell'utile/perdita dell'esercizio precedente",
      "□ Verificare i versamenti soci in conto capitale o a copertura perdite",
      "□ Controllare le distribuzioni di utili effettuate nel periodo",
      "□ Verificare la corretta movimentazione delle riserve",
    ],
  },
  {
    key: "debiti",
    label: "Debiti verso Fornitori",
    keywords: [
      "debiti verso fornitori", "debiti fornitori", "fatture da ricevere",
      "debiti commerciali", "debiti vs fornitori", "debiti v/fornitori",
      "fornitori c/fatture da ricevere",
    ],
    procedures: [
      "□ Effettuare la circolarizzazione dei fornitori di importo significativo",
      "□ Verificare le fatture da ricevere a fine periodo (cut-off acquisti)",
      "□ Controllare note di debito/credito ricevute dopo la chiusura",
      "□ Verificare debiti verso fornitori esteri e rischio cambio",
      "□ Controllare debiti verso parti correlate e condizioni applicate",
      "□ Riconciliare i saldi con gli estratti conto fornitori principali",
    ],
  },
  {
    key: "debiti_finanziari",
    label: "Debiti Finanziari e Banche",
    keywords: [
      "mutui", "finanziamenti", "obbligazioni", "prestiti", "debiti verso banche",
      "debiti vs banche", "scoperti bancari", "fidi bancari", "leasing",
      "debiti finanziari", "quota corrente mutui",
    ],
    procedures: [
      "□ Riconciliare i saldi dei mutui/finanziamenti con i prospetti bancari",
      "□ Verificare la corretta separazione quota corrente/non corrente",
      "□ Controllare eventuali covenant bancari e relativo rispetto",
      "□ Verificare le garanzie prestate a fronte dei finanziamenti",
      "□ Controllare i nuovi finanziamenti accesi nel periodo",
    ],
  },
  {
    key: "debiti_tributari",
    label: "Debiti Tributari e Previdenziali",
    keywords: [
      "debiti tributari", "debiti verso erario", "iva a debito", "ires", "irap",
      "debiti verso inps", "inail", "debiti previdenziali", "ritenute da versare",
      "imposte", "tasse", "contributi da versare",
    ],
    procedures: [
      "□ Verificare la correttezza della liquidazione IVA periodica",
      "□ Controllare la corretta determinazione e contabilizzazione di IRES e IRAP",
      "□ Verificare i versamenti contributivi e le ritenute operate",
      "□ Controllare eventuali contenzioso tributario in corso",
      "□ Verificare la congruità delle imposte differite e anticipate",
    ],
  },
  {
    key: "tfr_fondi",
    label: "TFR e Fondi per Rischi",
    keywords: [
      "tfr", "trattamento fine rapporto", "fondo trattamento",
      "fondi per rischi", "fondo rischi", "accantonamenti", "fondo garanzie",
      "fondo svalutazione", "fondo oneri futuri",
    ],
    procedures: [
      "□ Verificare il calcolo attuariale del TFR (se applicabile OIC 33/IAS 19)",
      "□ Controllare i movimenti del fondo TFR (accantonamenti, utilizzi, anticipi)",
      "□ Valutare la congruità degli altri fondi per rischi e oneri",
      "□ Verificare l'esistenza di passività potenziali non contabilizzate",
      "□ Controllare le eventuali polizze assicurative a copertura dei fondi",
    ],
  },
  {
    key: "ricavi",
    label: "Ricavi e Proventi",
    keywords: [
      "ricavi", "vendita", "ricavi delle vendite", "ricavi da servizi",
      "prestazioni di servizi", "proventi", "corrispettivi",
      "fatturato", "contributi in conto esercizio", "altri ricavi", "plusvalenze",
      // proventi finanziari: vanno nei ricavi, non negli oneri
      "interessi attivi", "proventi finanziari", "dividendi", "utili su cambi",
      "rivalutazione partecipazioni",
    ],
    procedures: [
      "□ Verificare il cut-off dei ricavi a fine periodo (ultime fatture/DDT)",
      "□ Analizzare l'andamento dei ricavi rispetto all'esercizio precedente",
      "□ Verificare la corretta rilevazione dei ricavi per commesse/contratti pluriennali",
      "□ Controllare note di credito emesse e rettifiche di ricavo",
      "□ Verificare l'esistenza di ricavi da parti correlate e condizioni di mercato",
      "□ Controllare la corretta classificazione tra ricavi tipici e altri proventi",
    ],
  },
  {
    key: "costi_personale",
    label: "Costi del Personale",
    keywords: [
      "personale", "salari", "stipendi", "contributi previdenziali",
      "retribuzione", "lavoratori dipendenti", "collaboratori",
      "compensi amministratori", "compensi sindaci", "rimborsi spese dipendenti",
    ],
    procedures: [
      "□ Riconciliare il costo del lavoro con i dati paghe (LUL)",
      "□ Verificare la corretta contabilizzazione degli accantonamenti (ferie, ROL, 13a)",
      "□ Controllare i compensi agli organi sociali e relativa delibera assembleare",
      "□ Verificare la congruità del numero di dipendenti e relativo costo medio",
      "□ Controllare eventuali contenziosi di lavoro in corso",
    ],
  },
  {
    key: "acquisti_costi",
    label: "Acquisti e Costi Operativi",
    keywords: [
      "acquisti", "materie prime", "merci c/acquisti", "servizi",
      "godimento beni di terzi", "noleggio", "utenze", "affitti", "locazioni",
      "manutenzione", "consulenze", "pubblicità", "spese generali",
      "costi per servizi", "spese amministrative",
      "autofattur", "reverse charge", "inversione contabile", "autoaddebito",
    ],
    procedures: [
      "□ Verificare il cut-off degli acquisti a fine periodo",
      "□ Analizzare l'andamento dei costi rispetto all'esercizio precedente",
      "□ Verificare la corretta classificazione delle spese capitalizzabili vs spese di esercizio",
      "□ Controllare i contratti significativi (affitti, utenze, consulenze)",
      "□ Verificare i pagamenti a parti correlate e congruità delle condizioni",
    ],
  },
  {
    key: "oneri_finanziari",
    label: "Oneri Finanziari",
    keywords: [
      "interessi passivi", "oneri finanziari",
      "perdite su cambi", "svalutazione partecipazioni",
    ],
    procedures: [
      "□ Riconciliare gli interessi passivi con i prospetti di ammortamento dei finanziamenti",
      "□ Verificare la corretta capitalizzazione degli interessi (se applicabile)",
      "□ Controllare utili/perdite su cambi e relativa gestione del rischio valutario",
      "□ Verificare la valutazione delle partecipazioni",
    ],
  },
];

export function classifyAccount(name: string): string {
  const lower = name.toLowerCase();
  for (const area of AUDIT_AREAS) {
    if (area.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return area.key;
    }
  }
  return "altri";
}

export function getArea(key: string): AuditArea | undefined {
  return AUDIT_AREAS.find((a) => a.key === key);
}

export function getAreaLabel(key: string): string {
  return getArea(key)?.label ?? "Altri conti";
}

export function getAreaProcedures(key: string): string[] {
  return getArea(key)?.procedures ?? [
    "□ Analizzare le variazioni significative rispetto al periodo precedente",
    "□ Verificare la documentazione di supporto per i movimenti principali",
    "□ Controllare la corretta classificazione in bilancio",
  ];
}
