"use client";

import { Fragment, useEffect, useState } from "react";

// ── Tipi (sottoinsieme del report di accounting-service, vedi ../page.tsx) ───

type Esito = "ok" | "scostamento" | "non_verificabile";

interface Prova {
  titolo: string;
  documento: string;
}

interface Riscontro {
  voce: string;
  codice: string;
  valore_bilancio: number | null;
  valore_riscontrato: number | null;
  esito: Esito;
  scostamento: number | null;
  prove: Prova[];
  note: string[];
  commento_ai: string | null;
}

type StatoSalute = "solido" | "attenzione" | "critico" | "non_determinabile";

interface Misura {
  etichetta: string;
  valore: number | null;
  formato: "euro" | "percento" | "volte";
}

interface Indicatore {
  dimensione: string;
  stato: StatoSalute;
  misure: Misura[];
  soglie: string;
  nota: string | null;
}

interface Salute {
  complessivo: StatoSalute;
  indicatori: Indicatore[];
  avvertenza: string;
  giudizio_ai: string | null;
}

type EsitoNota = "segnalazione_inviata" | "anomalia_non_riscontrata";

interface SaluteNota {
  id: string;
  indicatore: string;
  nota: string | null;
  esito: EsitoNota | null;
}

interface RiscontroNota {
  id: string;
  codice: string;
  nota: string | null;
  esito: EsitoNota | null;
}

const ESITO_NOTA_LABEL: Record<EsitoNota, string> = {
  segnalazione_inviata: "Segnalazione inviata",
  anomalia_non_riscontrata: "Anomalia non riscontrata in seguito a verifica",
};

/**
 * Riquadro nota del revisore, usato sia per i riscontri (sez. 3) sia per gli indicatori
 * di salute (sez. 5). Stile volutamente sobrio — un unico bordo sottile, nessun colore
 * né icona — per restare coerente con il registro di un documento ufficiale: nota ed
 * esito sono etichette testuali esplicite, non elementi grafici.
 */
function NotaRevisoreBox({
  titolo,
  nota,
  esito,
}: {
  titolo: string;
  nota: string | null | undefined;
  esito: EsitoNota | null | undefined;
}) {
  if (!nota && !esito) return null;

  return (
    <div style={{ margin: "10px 0", border: "1px solid #4b5563", padding: "8px 12px", fontSize: 12.5, color: "#1f2937" }}>
      <p style={{ margin: "0 0 6px 0", fontWeight: 700 }}>Nota del revisore — {titolo}</p>
      {nota && (
        <p style={{ margin: esito ? "0 0 6px 0" : 0, whiteSpace: "pre-wrap" }}>
          {nota}
        </p>
      )}
      {esito && (
        <p style={{ margin: 0 }}>
          <strong>Esito della verifica: </strong>
          {ESITO_NOTA_LABEL[esito]}
        </p>
      )}
    </div>
  );
}

interface Report {
  meta: { denominazione?: string; data_bilancio?: string; trimestre?: number | null };
  stato_patrimoniale: {
    totale_attivita: number | null;
    totale_passivita: number | null;
    risultato_esercizio: number | null;
    tipo_risultato?: string | null;
    anomalia: boolean;
  };
  conto_economico: { presente: boolean; anomalia: boolean };
  salute: Salute | null;
  anomalie: { messaggio: string }[];
  riscontri: Riscontro[];
  sintesi_ai: string | null;
  documenti_analizzati: number;
  conteggio_voci?: number;
}

// ── Formattazione ─────────────────────────────────────────────────────────

const eur = (n: number | null | undefined) =>
  typeof n === "number"
    ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

const misuraFmt = (m: Misura) => {
  if (m.valore == null) return "—";
  if (m.formato === "percento") return `${m.valore.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
  if (m.formato === "volte") return `${m.valore.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
  return `€ ${eur(m.valore)}`;
};

const STATO_LABEL: Record<StatoSalute, string> = {
  solido: "Solido",
  attenzione: "Attenzione",
  critico: "Critico",
  non_determinabile: "Non determinabile",
};

const STATO_GIUDIZIO: Record<StatoSalute, string> = {
  solido:
    "coerente con le evidenze raccolte, con indicatori di salute aziendale complessivamente solidi.",
  attenzione:
    "nel complesso adeguata, sebbene alcuni indicatori richiedano attenzione nei periodi successivi.",
  critico:
    "caratterizzata da criticità che richiedono approfondimento e un monitoraggio ravvicinato.",
  non_determinabile:
    "non pienamente valutabile sulla base dei soli dati disponibili per il trimestre.",
};

function conclusioneRiscontro(r: Riscontro): string {
  if (r.commento_ai && r.commento_ai.trim()) return r.commento_ai.trim();
  if (r.esito === "ok") {
    const residuo = r.scostamento != null && Math.abs(r.scostamento) > 0.005
      ? ` (scostamento residuo di € ${eur(Math.abs(r.scostamento))}, non significativo)`
      : "";
    return `Voce riscontrata: il valore a bilancio trova conferma nelle evidenze documentali esaminate${residuo}.`;
  }
  if (r.esito === "scostamento") {
    return `Rilevato uno scostamento di € ${eur(r.scostamento != null ? Math.abs(r.scostamento) : null)} tra il valore a bilancio e quello riscontrato dai documenti a corredo: si raccomanda un approfondimento.`;
  }
  return "Non è stato possibile riscontrare la voce con i documenti disponibili per il trimestre: verifica non conclusiva.";
}

function procedureRiscontro(r: Riscontro): string {
  const fonti = r.prove.map((p) => `${p.titolo} (${p.documento})`).join("; ");
  const note = r.note.join(" ");
  const testo = [fonti, note].filter(Boolean).join(" — ");
  return testo || "Nessuna evidenza documentale disponibile per il riscontro di questa voce.";
}

// ── Componente ───────────────────────────────────────────────────────────

export function CartaLavoroContent({
  assignmentId,
  quarterId,
  companyName,
  companyCity,
  year,
  quarterLabel,
  quarterRange,
  typeLabel,
  revisorName,
}: {
  assignmentId: string;
  quarterId: string;
  companyName: string;
  companyCity: string | null;
  year: number;
  quarterLabel: string;
  quarterRange: string;
  typeLabel: string;
  revisorName: string | null;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [saluteNote, setSaluteNote] = useState<Record<string, SaluteNota>>({});
  const [riscontroNote, setRiscontroNote] = useState<Record<string, RiscontroNota>>({});

  useEffect(() => {
    let annullato = false;
    (async () => {
      const res = await fetch(`/api/accounting/salute-note?quarter_id=${quarterId}`).catch(() => null);
      if (res?.ok) {
        const note: SaluteNota[] = await res.json();
        if (!annullato) setSaluteNote(Object.fromEntries(note.map((n) => [n.indicatore, n])));
      }
      const resRiscontri = await fetch(`/api/accounting/riscontro-note?quarter_id=${quarterId}`).catch(() => null);
      if (resRiscontri?.ok) {
        const note: RiscontroNota[] = await resRiscontri.json();
        if (!annullato) setRiscontroNote(Object.fromEntries(note.map((n) => [n.codice, n])));
      }
    })();
    return () => { annullato = true; };
  }, [quarterId]);

  useEffect(() => {
    let annullato = false;

    const cacheKey = `carta-lavoro-report-${quarterId}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setReport(JSON.parse(cached));
        return;
      }
    } catch {
      // sessionStorage non disponibile o dato non valido: si ricalcola sotto
    }

    (async () => {
      try {
        // Niente in cache: recupera l'ultima revisione salvata, senza ricalcolare — il
        // ricalcolo è un'azione esplicita (bottone "Ricalcola" nella pagina di revisione).
        const res = await fetch(`/api/accounting/review/${quarterId}`);
        const data = await res.json();
        if (annullato) return;
        if (!res.ok) throw new Error(data?.error ?? "Nessuna revisione calcolata: apri prima la pagina di Revisione del trimestre.");
        setReport(data);
      } catch (e) {
        if (!annullato) setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      }
    })();

    return () => { annullato = true; };
  }, [quarterId]);

  const oggi = new Date().toLocaleDateString("it-IT");

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
        <p className="text-sm font-medium text-gray-700">Generazione della carta di lavoro in corso…</p>
        <p className="max-w-sm text-center text-xs text-gray-500">
          Lettura del bilancio e dei documenti a corredo; può richiedere una trentina di secondi.
        </p>
      </div>
    );
  }

  const areeCritiche = report.riscontri.filter((r) => r.esito !== "ok");
  const salute = report.salute;

  return (
    <div className="text-sm leading-relaxed text-gray-800 font-serif">
      {/* 1. Informazioni generali */}
      <h2 className="text-base font-bold mb-2" style={{ color: "#2a4b7e" }}>
        1. Informazioni generali
      </h2>
      <p className="mb-1">Società: {companyName}</p>
      <p className="mb-1">
        Periodo di revisione: {quarterLabel} {year} ({quarterRange} {year})
      </p>
      <p className="mb-1">Tipo di incarico: {typeLabel}</p>
      <p className="mb-4">Data redazione: {oggi}</p>

      <p className="mb-3 text-justify">
        La presente carta di lavoro documenta la revisione svolta sul bilancio infrannuale
        {report.meta.data_bilancio ? ` al ${report.meta.data_bilancio}` : ""} di {companyName}
        {companyCity ? `, con sede a ${companyCity}` : ""}. L&apos;esame ha avuto lo scopo di
        verificare la correttezza dei dati contabili e la rappresentazione veritiera e corretta
        della situazione patrimoniale{report.conto_economico.presente ? " e del risultato economico" : ""}{" "}
        del periodo.
      </p>

      <table className="cdl-table mb-6">
        <tbody>
          <tr>
            <th style={{ width: "33%" }}>Totale attività</th>
            <th style={{ width: "33%" }}>Totale passività</th>
            <th>Risultato del periodo</th>
          </tr>
          <tr>
            <td>€ {eur(report.stato_patrimoniale.totale_attivita)}</td>
            <td>€ {eur(report.stato_patrimoniale.totale_passivita)}</td>
            <td>
              € {eur(report.stato_patrimoniale.risultato_esercizio)}
              {report.stato_patrimoniale.tipo_risultato ? ` (${report.stato_patrimoniale.tipo_risultato})` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 2. Pianificazione della revisione */}
      <h2 className="text-base font-bold mb-2" style={{ color: "#2a4b7e" }}>
        2. Pianificazione della revisione
      </h2>
      <p className="mb-3 text-justify">
        Sono stati analizzati {report.documenti_analizzati} documenti a supporto del bilancio
        {typeof report.conteggio_voci === "number" ? `, per un totale di ${report.conteggio_voci} voci contabili estratte dal bilancio di verifica` : ""}.
        La pianificazione, basata su test sostanziali data la dimensione della struttura amministrativa,
        ha individuato quali aree di maggiore attenzione quelle risultate non pienamente riscontrabili
        o con scostamento rispetto al bilancio in sede di riconciliazione:
      </p>
      {areeCritiche.length > 0 ? (
        <ul className="mb-4 list-disc pl-6">
          {areeCritiche.map((r) => (
            <li key={r.codice}>{r.voce}</li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 italic">
          Nessuna area di particolare criticità è emersa in fase di pianificazione: tutte le voci
          chiave sono risultate riscontrabili con i documenti a corredo disponibili.
        </p>
      )}

      {/* 3. Carte di lavoro per area di bilancio */}
      <h2 className="text-base font-bold mb-2" style={{ color: "#2a4b7e" }}>
        3. Carte di lavoro per area di bilancio
      </h2>
      <table className="cdl-table mb-6">
        <thead>
          <tr>
            <th>Area</th>
            <th>Valore a bilancio (€)</th>
            <th>Procedure / Evidenze raccolte</th>
            <th>Conclusioni del revisore</th>
          </tr>
        </thead>
        <tbody>
          {report.riscontri.map((r) => {
            const notaRevisore = riscontroNote[r.codice];
            const mostraNota = r.esito !== "ok" && (notaRevisore?.nota || notaRevisore?.esito);
            return (
              <Fragment key={r.codice}>
                <tr>
                  <td>{r.voce}</td>
                  <td>{eur(r.valore_bilancio)}</td>
                  <td>{procedureRiscontro(r)}</td>
                  <td>{conclusioneRiscontro(r)}</td>
                </tr>
                {mostraNota && (
                  <tr>
                    <td colSpan={4} style={{ padding: 4 }}>
                      <NotaRevisoreBox titolo={r.voce} nota={notaRevisore?.nota} esito={notaRevisore?.esito} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* 4. Analisi finale e giudizio del revisore */}
      <h2 className="text-base font-bold mb-2" style={{ color: "#2a4b7e" }}>
        4. Analisi finale e giudizio del revisore
      </h2>
      {report.sintesi_ai && <p className="mb-3 text-justify">{report.sintesi_ai}</p>}
      {salute?.giudizio_ai && <p className="mb-3 text-justify">{salute.giudizio_ai}</p>}

      {report.anomalie.length > 0 && (
        <>
          <p className="mb-1 font-semibold">Sono state rilevate le seguenti anomalie nel bilancio:</p>
          <ul className="mb-3 list-disc pl-6">
            {report.anomalie.map((a, i) => <li key={i}>{a.messaggio}</li>)}
          </ul>
        </>
      )}

      <p className="mb-6 text-justify">
        Sulla base delle verifiche svolte, la situazione patrimoniale
        {report.conto_economico.presente ? " e il risultato economico" : ""} del periodo risulta{" "}
        {salute ? STATO_GIUDIZIO[salute.complessivo] : "non pienamente valutabile per assenza di indicatori di salute calcolabili."}
      </p>

      <p className="mt-10 mb-1">{revisorName ?? "Il revisore"}</p>
      <p>Firma del revisore ____________________________</p>

      {/* 5. Analisi per indicatori di salute aziendale */}
      {salute && (
        <div className="page-break">
          <h2 className="text-base font-bold mb-1 mt-10" style={{ color: "#2a4b7e" }}>
            5. Analisi per indicatori di salute aziendale
          </h2>
          <p className="mb-4 text-justify">
            Di seguito si riportano gli indicatori di salute calcolati sulla base dei dati del
            trimestre. Giudizio complessivo:{" "}
            <strong>{STATO_LABEL[salute.complessivo]}</strong>.
          </p>

          {salute.indicatori.map((ind, i) => {
            const notaRevisore = saluteNote[ind.dimensione];
            const critico = ind.stato === "critico" || ind.stato === "attenzione";
            return (
              <div key={i} className="mb-5">
                <table className="cdl-table">
                  <thead>
                    <tr>
                      <th colSpan={2}>
                        {ind.dimensione} — {STATO_LABEL[ind.stato]}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ind.misure.map((m, j) => (
                      <tr key={j}>
                        <td style={{ width: "60%" }}>{m.etichetta}</td>
                        <td>{misuraFmt(m)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-xs italic text-gray-600">{ind.soglie}</p>
                {ind.nota && <p className="text-xs italic text-amber-700">{ind.nota}</p>}
                {critico && (
                  <NotaRevisoreBox titolo={ind.dimensione} nota={notaRevisore?.nota} esito={notaRevisore?.esito} />
                )}
              </div>
            );
          })}

          <p className="mt-4 mb-1 font-semibold">Commento sintetico:</p>
          <p className="mb-2 text-justify">
            {salute.giudizio_ai ?? report.sintesi_ai ?? "Nessun commento discorsivo disponibile per questo trimestre."}
          </p>
          <p className="text-xs italic text-gray-500">{salute.avvertenza}</p>
        </div>
      )}

      <p className="mt-10 text-[10px] text-gray-400">
        Documento generato automaticamente dalla revisione AI del trimestre — incarico {assignmentId}, trimestre {quarterId}.
        Tutti gli importi riportati sono stati letti dai documenti caricati e sommati in codice;
        il commento discorsivo, ove presente, è prodotto da un modello linguistico e non sostituisce
        il giudizio professionale del revisore.
      </p>
    </div>
  );
}
