"use client";

import { useEffect, useState } from "react";

// ── Tipi (sottoinsieme del report di accounting-service, vedi ../page.tsx) ───

type Esito = "ok" | "scostamento" | "non_verificabile";

interface Riscontro {
  voce: string;
  codice: string;
  valore_bilancio: number | null;
  valore_riscontrato: number | null;
  esito: Esito;
  scostamento: number | null;
}

interface Report {
  periodo?: "trimestrale" | "annuale";
  meta: {
    denominazione?: string;
    sede?: string;
    partita_iva?: string;
    codice_fiscale?: string;
    attivita?: string;
    data_bilancio?: string;
    anno?: number | null;
  };
  stato_patrimoniale: { anomalia: boolean };
  conto_economico: { presente: boolean; anomalia: boolean };
  anomalie: { messaggio: string }[];
  riscontri: Riscontro[];
}

type EsitoNota = "segnalazione_inviata" | "anomalia_non_riscontrata";

interface RiscontroNota {
  id: string;
  codice: string;
  nota: string | null;
  esito: EsitoNota | null;
}

// ── Formattazione ─────────────────────────────────────────────────────────

const eur = (n: number | null | undefined) =>
  typeof n === "number"
    ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

const FORME_GIURIDICHE: Record<string, string> = {
  SRL: "Società a Responsabilità Limitata",
  SPA: "Società per Azioni",
  SAS: "Società in Accomandita Semplice",
  SNC: "Società in Nome Collettivo",
};

function formaGiuridicaDa(nome: string): string | null {
  const m = nome.match(/\b(S\.?\s?R\.?\s?L\.?|S\.?\s?P\.?\s?A\.?|S\.?\s?A\.?\s?S\.?|S\.?\s?N\.?\s?C\.?)\.?\s*$/i);
  if (!m?.[1]) return null;
  const sigla = m[1].replace(/[.\s]/g, "").toUpperCase();
  return FORME_GIURIDICHE[sigla] ?? null;
}

/** Campo compilato dal sistema, o segnaposto ben visibile da completare a mano prima dell'uso. */
function Campo({ value, placeholder }: { value: string | null | undefined; placeholder: string }) {
  if (value) return <>{value}</>;
  return <span style={{ background: "#fff3cd" }}>[{placeholder}]</span>;
}

// ── Componente ───────────────────────────────────────────────────────────

/**
 * Relazione del revisore indipendente ai sensi dell'art. 14 del D.Lgs. 39/2010 — SOLO
 * per incarichi di tipo "revisione legale". Sostituisce la carta di lavoro per il 4°
 * trimestre (revisione annuale): il testo di legge (premesse, responsabilità, principi
 * ISA Italia) resta fisso, si adattano solo i dati anagrafici e il giudizio finale, che
 * diventa "con rilievi" se la revisione ha trovato scostamenti non chiariti o anomalie
 * nel bilancio.
 *
 * Un rilievo NON entra nel giudizio se il revisore, tramite la nota sul singolo riscontro
 * (pagina di Revisione), l'ha segnato come "Anomalia non riscontrata in seguito a verifica":
 * significa che, dopo controllo, non è un problema reale.
 *
 * ATTENZIONE: bozza generata automaticamente. Alcuni dati anagrafici (capitale sociale,
 * REA, CCIAA, forma giuridica se non deducibile dalla denominazione) non sono censiti nel
 * sistema e restano evidenziati come segnaposto da completare — così come l'intero
 * documento, richiede la revisione professionale del revisore prima dell'uso.
 */
export function RelazioneFinaleContent({
  quarterId,
  companyName,
  companyCity,
  companyFiscalCode,
  year,
  revisorName,
}: {
  assignmentId: string;
  quarterId: string;
  companyName: string;
  companyCity: string | null;
  companyFiscalCode: string | null;
  year: number;
  quarterLabel: string;
  quarterRange: string;
  typeLabel: string;
  revisorName: string | null;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [riscontroNote, setRiscontroNote] = useState<Record<string, RiscontroNota>>({});
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let annullato = false;
    (async () => {
      const res = await fetch(`/api/accounting/riscontro-note?quarter_id=${quarterId}`).catch(() => null);
      if (res?.ok) {
        const note: RiscontroNota[] = await res.json();
        if (!annullato) setRiscontroNote(Object.fromEntries(note.map((n) => [n.codice, n])));
      }
    })();
    return () => { annullato = true; };
  }, [quarterId]);

  useEffect(() => {
    let annullato = false;

    const cacheKey = `carta-lavoro-report-${quarterId}`; // stessa cache della revisione: un report per trimestre
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setReport(JSON.parse(cached));
        return;
      }
    } catch {
      // sessionStorage non disponibile o dato non valido: si recupera sotto
    }

    (async () => {
      try {
        const res = await fetch(`/api/accounting/review/${quarterId}`);
        const data = await res.json();
        if (annullato) return;
        if (!res.ok) throw new Error(data?.error ?? "Nessuna revisione annuale calcolata: apri prima la pagina di Revisione del trimestre.");
        setReport(data);
      } catch (e) {
        if (!annullato) setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      }
    })();

    return () => { annullato = true; };
  }, [quarterId]);

  if (errore) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {errore}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 no-print">
        <svg className="h-7 w-7 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-medium text-gray-700">Recupero della revisione annuale…</p>
      </div>
    );
  }

  // Rilievi: scostamenti/voci non verificabili NON chiuse da una nota "anomalia non
  // riscontrata in seguito a verifica" — quelle sono state controllate e scartate.
  const rilievi = report.riscontri.filter((r) => {
    if (r.esito === "ok") return false;
    return riscontroNote[r.codice]?.esito !== "anomalia_non_riscontrata";
  });
  const bilancioAnomalo = report.stato_patrimoniale.anomalia || report.conto_economico.anomalia;
  const conRilievi = rilievi.length > 0 || bilancioAnomalo || report.anomalie.length > 0;

  const denominazione = report.meta.denominazione || companyName;
  const sede = report.meta.sede || companyCity || null;
  const partitaIva = report.meta.partita_iva || companyFiscalCode || null;
  const codiceFiscale = report.meta.codice_fiscale || companyFiscalCode || null;
  const formaGiuridica = formaGiuridicaDa(denominazione);
  const esercizioAl = report.meta.data_bilancio || `31/12/${report.meta.anno ?? year}`;
  const oggi = new Date().toLocaleDateString("it-IT");

  return (
    <div className="text-sm leading-relaxed text-gray-800 font-serif">
      {/* Intestazione anagrafica */}
      <table className="cdl-table mb-6">
        <tbody>
          <tr><th style={{ width: "45%" }}>Denominazione</th><td>{denominazione}</td></tr>
          <tr><th>Sede</th><td><Campo value={sede} placeholder="sede legale — completare" /></td></tr>
          <tr><th>Forma giuridica</th><td><Campo value={formaGiuridica} placeholder="completare" /></td></tr>
          <tr><th>Capitale sociale</th><td><Campo value={null} placeholder="completare" /></td></tr>
          <tr><th>Capitale sociale interamente versato</th><td><Campo value={null} placeholder="completare" /></td></tr>
          <tr><th>Codice CCIAA</th><td><Campo value={null} placeholder="completare" /></td></tr>
          <tr><th>Partita IVA</th><td><Campo value={partitaIva} placeholder="completare" /></td></tr>
          <tr><th>Codice Fiscale</th><td><Campo value={codiceFiscale} placeholder="completare" /></td></tr>
          <tr><th>Numero REA</th><td><Campo value={null} placeholder="completare" /></td></tr>
          <tr><th>Settore di attività prevalente (ATECO)</th><td><Campo value={report.meta.attivita} placeholder="completare" /></td></tr>
          <tr><th>Società in liquidazione</th><td>NO</td></tr>
          <tr><th>Società con socio unico</th><td>NO</td></tr>
          <tr><th>Società sottoposta ad altrui direzione e coordinamento</th><td>NO</td></tr>
          <tr><th>Appartenenza a un Gruppo</th><td>NO</td></tr>
        </tbody>
      </table>

      <h1 className="text-base font-bold text-center mb-1 uppercase" style={{ color: "#2a4b7e" }}>
        Relazione del revisore indipendente
      </h1>
      <p className="text-center mb-6 text-xs">
        ai sensi dell&apos;art. 14 del D.Lgs. 27 gennaio 2010, n. 39
      </p>

      <p className="mb-4">All&apos;Assemblea dei Soci della società {denominazione}</p>

      <h2 className="text-base font-bold mb-2" style={{ color: "#2a4b7e" }}>
        Relazione sulla revisione contabile del bilancio d&apos;esercizio
      </h2>

      <p className="mb-1 font-semibold">Giudizio{conRilievi ? " con rilievi" : ""}</p>
      <p className="mb-3 text-justify">
        Ho svolto la revisione contabile del bilancio d&apos;esercizio della Società {denominazione}, costituito
        dallo stato patrimoniale al {esercizioAl}, dal conto economico e dal rendiconto finanziario per
        l&apos;esercizio chiuso a tale data e dalla nota integrativa.
      </p>
      <p className="mb-3 text-justify">
        {conRilievi
          ? <>A mio giudizio, ad eccezione degli effetti/dei possibili effetti delle problematiche descritte nel
              paragrafo «Elementi alla base del giudizio con rilievi», il bilancio d&apos;esercizio fornisce una
              rappresentazione veritiera e corretta della situazione patrimoniale e finanziaria della Società al
              {" "}{esercizioAl}, del risultato economico e dei flussi di cassa per l&apos;esercizio chiuso a tale
              data in conformità alle norme italiane che ne disciplinano i criteri di redazione.</>
          : <>A mio giudizio, il bilancio d&apos;esercizio fornisce una rappresentazione veritiera e corretta della
              situazione patrimoniale e finanziaria della Società al {esercizioAl}, del risultato economico e dei
              flussi di cassa per l&apos;esercizio chiuso a tale data in conformità alle norme italiane che ne
              disciplinano i criteri di redazione.</>}
      </p>

      {conRilievi && (
        <>
          <p className="mb-1 font-semibold">Elementi alla base del giudizio con rilievi</p>
          <ul className="mb-3 list-disc pl-6">
            {report.anomalie.map((a, i) => <li key={`an-${i}`}>{a.messaggio}</li>)}
            {report.stato_patrimoniale.anomalia && (
              <li>Le passività risultano superiori alle attività nello stato patrimoniale.</li>
            )}
            {report.conto_economico.anomalia && (
              <li>I costi risultano superiori ai ricavi nel conto economico.</li>
            )}
            {rilievi.map((r) => {
              const nota = riscontroNote[r.codice];
              return (
                <li key={r.codice}>
                  <strong>{r.voce}: </strong>
                  {r.esito === "scostamento"
                    ? <>scostamento di € {eur(r.scostamento != null ? Math.abs(r.scostamento) : null)} tra il
                        valore a bilancio (€ {eur(r.valore_bilancio)}) e quanto riscontrato dalla documentazione a
                        corredo (€ {eur(r.valore_riscontrato)}).</>
                    : "voce non riscontrabile con la documentazione disponibile."}
                  {nota?.esito === "segnalazione_inviata" && " Segnalazione già inviata alla società."}
                  {nota?.nota && ` ${nota.nota}`}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="mb-1 font-semibold">Elementi alla base del giudizio</p>
      <p className="mb-3 text-justify">
        Ho svolto la revisione contabile in conformità ai principi di revisione internazionali ISA Italia. Le mie
        responsabilità ai sensi di tali principi sono ulteriormente descritte nella sezione «Responsabilità del
        Revisore per la revisione contabile del bilancio d&apos;esercizio» della presente relazione. Sono
        indipendente rispetto alla Società in conformità alle norme e ai principi in materia di etica e di
        indipendenza applicabili nell&apos;ordinamento italiano alla revisione contabile del bilancio. Ritengo di
        aver acquisito elementi probativi sufficienti ed appropriati su cui basare il mio giudizio{conRilievi ? " con rilievi" : ""}.
      </p>

      <p className="mb-1 font-semibold">Responsabilità degli Amministratori e Revisore per il bilancio d&apos;esercizio</p>
      <p className="mb-3 text-justify">
        Gli Amministratori sono responsabili per la redazione del bilancio d&apos;esercizio che fornisca una
        rappresentazione veritiera e corretta in conformità alle norme italiane che ne disciplinano i criteri di
        redazione e, nei termini previsti dalla legge, per quella parte del controllo interno dagli stessi ritenuta
        necessaria per consentire la redazione di un bilancio che non contenga errori significativi dovuti a frodi
        o a comportamenti o eventi non intenzionali.
      </p>
      <p className="mb-3 text-justify">
        Gli Amministratori sono responsabili per la valutazione della capacità della Società di continuare ad
        operare come un&apos;entità in funzionamento e, nella redazione del bilancio d&apos;esercizio, per
        l&apos;appropriatezza dell&apos;utilizzo del presupposto della continuità aziendale, nonché per una
        adeguata informativa in materia. Gli Amministratori utilizzano il presupposto della continuità aziendale
        nella redazione del bilancio d&apos;esercizio a meno che abbiano valutato che sussistono le condizioni per
        la liquidazione della Società o per l&apos;interruzione dell&apos;attività o non abbiano alternative
        realistiche a tali scelte.
      </p>
      <p className="mb-3 text-justify">
        Il Revisore ha la responsabilità della vigilanza, nei termini previsti dalla legge, sul processo di
        predisposizione dell&apos;informativa finanziaria della Società.
      </p>

      <p className="mb-1 font-semibold">Responsabilità del Revisore per la revisione contabile del bilancio d&apos;esercizio</p>
      <p className="mb-3 text-justify">
        I miei obiettivi sono l&apos;acquisizione di una ragionevole sicurezza che il bilancio d&apos;esercizio nel
        suo complesso non contenga errori significativi, dovuti a frodi o a comportamenti o eventi non
        intenzionali, e l&apos;emissione di una relazione di revisione che includa il mio giudizio. Per ragionevole
        sicurezza si intende un livello elevato di sicurezza che, tuttavia, non fornisce la garanzia che una
        revisione contabile svolta in conformità ai principi di revisione internazionali ISA Italia individui
        sempre un errore significativo, qualora esistente. Gli errori possono derivare da frodi o da comportamenti
        o eventi non intenzionali e sono considerati significativi qualora ci si possa ragionevolmente attendere
        che essi, singolarmente o nel loro insieme, siano in grado di influenzare le decisioni economiche prese
        dagli utilizzatori sulla base del bilancio d&apos;esercizio.
      </p>
      <p className="mb-2 text-justify">
        Nell&apos;ambito della revisione contabile svolta in conformità ai principi di revisione internazionali ISA
        Italia, ho esercitato il giudizio professionale ed ho mantenuto lo scetticismo professionale per tutta la
        durata della revisione contabile. Inoltre:
      </p>
      <ul className="mb-3 list-disc pl-6 text-justify">
        <li>
          ho identificato e valutato i rischi di errori significativi nel bilancio d&apos;esercizio, dovuti a frodi
          o a comportamenti o eventi non intenzionali; ho definito e svolto procedure di revisione in risposta a
          tali rischi; ho acquisito elementi probativi sufficienti ed appropriati su cui basare il mio giudizio. Il
          rischio di non individuare un errore significativo dovuto a frodi è più elevato rispetto al rischio di
          non individuare un errore significativo derivante da comportamenti o eventi non intenzionali, poiché la
          frode può implicare l&apos;esistenza di collusioni, falsificazioni, omissioni intenzionali,
          rappresentazioni fuorvianti o forzature del controllo interno;
        </li>
        <li>
          ho acquisito una comprensione del controllo interno rilevante ai fini della revisione contabile allo
          scopo di definire procedure di revisione appropriate nelle circostanze e non per esprimere un giudizio
          sull&apos;efficacia del controllo interno della Società;
        </li>
        <li>
          ho valutato l&apos;appropriatezza dei principi contabili utilizzati nonché la ragionevolezza delle stime
          contabili effettuate dagli Amministratori, inclusa la relativa informativa;
        </li>
        <li>
          sono giunto ad una conclusione sull&apos;appropriatezza dell&apos;utilizzo da parte degli Amministratori
          del presupposto della continuità aziendale e, in base agli elementi probativi acquisiti,
          sull&apos;eventuale esistenza di una incertezza significativa riguardo a eventi o circostanze che possono
          far sorgere dubbi significativi sulla capacità della Società di continuare ad operare come un&apos;entità
          in funzionamento. In presenza di un&apos;incertezza significativa, sono tenuto a richiamare
          l&apos;attenzione nella relazione di revisione sulla relativa informativa di bilancio, ovvero, qualora
          tale informativa sia inadeguata, a riflettere tale circostanza nella formulazione del mio giudizio. Le
          mie conclusioni sono basate sugli elementi probativi acquisiti fino alla data della presente relazione.
          Tuttavia, eventi o circostanze successivi possono comportare che la Società cessi di operare come
          un&apos;entità in funzionamento;
        </li>
        <li>
          ho valutato la presentazione, la struttura e il contenuto del bilancio d&apos;esercizio nel suo
          complesso, inclusa l&apos;informativa, e se il bilancio d&apos;esercizio rappresenti le operazioni e gli
          eventi sottostanti in modo da fornire una corretta rappresentazione;
        </li>
        <li>
          ho comunicato ai responsabili delle attività di governance, identificati ad un livello appropriato come
          richiesto dagli ISA Italia, tra gli altri aspetti, la portata e la tempistica pianificate per la
          revisione contabile e i risultati significativi emersi, incluse le eventuali carenze significative nel
          controllo interno identificate nel corso della revisione contabile.
        </li>
      </ul>

      <h2 className="text-base font-bold mb-2" style={{ color: "#2a4b7e" }}>
        Relazione su altre disposizioni di legge e regolamentari
      </h2>
      <p className="mb-1 font-semibold">Giudizio ai sensi dell&apos;art. 14, co. 2, lettera e), del D.Lgs. 39/10</p>
      <p className="mb-3 text-justify">
        Gli Amministratori della Società {denominazione} sono responsabili per la predisposizione della relazione
        sulla gestione al {esercizioAl} incluse la sua coerenza con il relativo bilancio d&apos;esercizio e la sua
        conformità alle norme di legge.
      </p>
      <p className="mb-3 text-justify">
        Ho svolto le procedure indicate nel principio di revisione (SA Italia) 720B al fine di esprimere un
        giudizio sulla coerenza della relazione sulla gestione con il bilancio d&apos;esercizio della Società{" "}
        {denominazione} al {esercizioAl} e sulla conformità della stessa alle norme di legge, nonché di rilasciare
        una dichiarazione su eventuali errori significativi.
      </p>
      <p className="mb-3 text-justify">
        A mio giudizio, la relazione sulla gestione è coerente con il bilancio d&apos;esercizio della Società al
        {" "}{esercizioAl} ed è redatta in conformità alle norme di legge.
      </p>
      <p className="mb-6 text-justify">
        Con riferimento alla dichiarazione di cui all&apos;art. 14, co. 2, lettera e), del D.Lgs. 39/10, rilasciata
        sulla base delle conoscenze e della comprensione dell&apos;impresa e del relativo contesto acquisite nel
        corso dell&apos;attività di revisione, non ho nulla da riportare.
      </p>

      <p className="mt-10 mb-1">
        <Campo value={sede} placeholder="luogo" /> {oggi}
      </p>
      <p className="mt-6">{revisorName ?? "Il revisore"}</p>
      <p>Firma del revisore ____________________________</p>

      <p className="mt-10 text-[10px] text-gray-400">
        Bozza generata automaticamente sulla base della revisione annuale del quarto trimestre — incarico{" "}
        {quarterId}. I dati anagrafici evidenziati vanno completati; il documento richiede la revisione
        professionale del revisore prima dell&apos;uso.
      </p>
    </div>
  );
}
