"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── Tipi (rispecchiano il report di accounting-service) ──────────────────────

type Esito = "ok" | "scostamento" | "non_verificabile";

interface Prova {
  titolo: string;
  documento: string;
  colonne: string[];
  righe: (string | number | null)[][];
  totale: { etichetta: string; valore: number } | null;
}

interface Confronto {
  etichetta: string;
  bilancio: number | null;
  riscontrato: number | null;
  /** Fonte del valore riscontrato (es. "Mastrino"); assente nei report più vecchi = partitario. */
  etichetta_riscontrato?: string;
  scostamento: number | null;
  esito: Esito;
}

interface Riscontro {
  voce: string;
  codice: string;
  valore_bilancio: number | null;
  valore_riscontrato: number | null;
  esito: Esito;
  scostamento: number | null;
  composizione: { codice: string; descrizione: string; importo: number }[];
  prove: Prova[];
  confronti: Confronto[];
  note: string[];
  commento_ai: string | null;
}

type StatoSalute = "solido" | "attenzione" | "critico" | "non_determinabile";

interface Misura {
  etichetta: string;
  valore: number | null;
  formato: "euro" | "percento" | "volte";
  evidenza?: boolean;
}

interface Indicatore {
  dimensione: string;
  domanda: string;
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

interface Report {
  meta: { denominazione?: string; data_bilancio?: string; trimestre?: number | null };
  stato_patrimoniale: {
    totale_attivita: number | null;
    totale_passivita: number | null;
    risultato_esercizio: number | null;
    anomalia: boolean;
  };
  conto_economico: { presente: boolean; anomalia: boolean };
  salute: Salute | null;
  anomalie: { messaggio: string }[];
  riscontri: Riscontro[];
  sintesi_ai: string | null;
  ai_used: boolean;
  ai_error: string | null;
  documenti_analizzati: number;
  computed_at?: string;
}

// ── Presentazione ────────────────────────────────────────────────────────────

const ESITO = {
  ok: {
    label: "Riscontrato",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    bordo: "border-l-emerald-500",
  },
  scostamento: {
    label: "Scostamento",
    badge: "bg-red-50 text-red-700 ring-red-600/20",
    dot: "bg-red-500",
    bordo: "border-l-red-500",
  },
  non_verificabile: {
    label: "Non verificabile",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/20",
    dot: "bg-amber-500",
    bordo: "border-l-amber-400",
  },
} as const;

const eur = (n: number | null | undefined) =>
  typeof n === "number"
    ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

const SALUTE = {
  solido: { label: "Solido", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  attenzione: { label: "Attenzione", badge: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500", bar: "bg-amber-500" },
  critico: { label: "Critico", badge: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500", bar: "bg-red-500" },
  non_determinabile: { label: "Non determinabile", badge: "bg-gray-100 text-gray-500 ring-gray-400/20", dot: "bg-gray-400", bar: "bg-gray-300" },
} as const;

const ESITO_NOTA_OPTIONS: { value: EsitoNota; label: string }[] = [
  { value: "segnalazione_inviata", label: "Segnalazione inviata" },
  { value: "anomalia_non_riscontrata", label: "Anomalia non riscontrata in seguito a verifica" },
];

const misura = (m: { valore: number | null; formato: string }) => {
  if (m.valore == null) return "—";
  if (m.formato === "percento") return `${m.valore.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
  if (m.formato === "volte") return `${m.valore.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
  return `€ ${eur(m.valore)}`;
};

const cella = (v: string | number | null) => (typeof v === "number" ? eur(v) : v ?? "—");

function Badge({ esito }: { esito: Esito }) {
  const c = ESITO[esito] ?? ESITO.non_verificabile;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

/** Le tre cifre che contano, in evidenza: è il cuore di ogni riscontro. */
function Cifre({ r }: { r: Riscontro }) {
  const scostamentoRilevante = r.esito === "scostamento";
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-gray-200 text-center">
      <div className="bg-white px-3 py-3">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">A bilancio</div>
        <div className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">{eur(r.valore_bilancio)}</div>
      </div>
      <div className="bg-white px-3 py-3">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Riscontrato</div>
        <div className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">{eur(r.valore_riscontrato)}</div>
      </div>
      <div className="bg-white px-3 py-3">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Scostamento</div>
        <div className={`mt-0.5 text-base font-semibold tabular-nums ${scostamentoRilevante ? "text-red-600" : "text-gray-900"}`}>
          {r.scostamento === null ? "—" : eur(Math.abs(r.scostamento))}
        </div>
      </div>
    </div>
  );
}

/** La prova del confronto: le righe realmente lette dal documento. */
function TabellaProva({ p }: { p: Prova }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="text-xs font-semibold text-gray-700">{p.titolo}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M6.75 12h9M6.75 15h9M6.75 18h5.25" />
          </svg>
          <span className="truncate">{p.documento}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              {p.colonne.map((c, i) => (
                <th key={i} className={`px-3 py-1.5 font-medium ${i === 0 ? "text-left" : "text-right"}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.righe.map((riga, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                {riga.map((v, j) => (
                  <td key={j} className={`px-3 py-1.5 ${j === 0 ? "text-left text-gray-700" : "text-right tabular-nums text-gray-900"}`}>
                    {cella(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {p.totale && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-gray-900">
                <td className="px-3 py-2 text-left">{p.totale.etichetta}</td>
                <td className="px-3 py-2 text-right tabular-nums" colSpan={Math.max(1, p.colonne.length - 1)}>
                  {eur(p.totale.valore)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/**
 * Nota del revisore + esito, riusata sia per gli indicatori di salute (Critico/Attenzione)
 * sia per i singoli riscontri del Dettaglio delle verifiche (Scostamento/Non verificabile).
 * `apiPath` e `bodyKey`/`bodyValue` selezionano l'endpoint e la chiave di upsert.
 */
function NotaRevisore<N extends { id: string; nota: string | null; esito: EsitoNota | null }>({
  apiPath,
  quarterId,
  bodyKey,
  bodyValue,
  nota,
  canEdit,
  onSaved,
}: {
  apiPath: string;
  quarterId: string;
  bodyKey: string;
  bodyValue: string;
  nota: N | undefined;
  canEdit: boolean;
  onSaved: (n: N) => void;
}) {
  const [testo, setTesto] = useState(nota?.nota ?? "");
  const [esito, setEsito] = useState<EsitoNota | "">(nota?.esito ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  // La nota arriva da un fetch separato (parte dopo il primo render): senza questo
  // effetto, il form restava vuoto anche quando una nota era già salvata, perché
  // useState cattura il valore solo al mount e non si aggiorna da solo quando la prop
  // arriva più tardi.
  useEffect(() => {
    setTesto(nota?.nota ?? "");
    setEsito(nota?.esito ?? "");
  }, [nota?.nota, nota?.esito]);

  const dirty = testo !== (nota?.nota ?? "") || esito !== (nota?.esito ?? "");

  async function salva() {
    setSaving(true);
    setErrore(null);
    try {
      const res = await fetch(apiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quarter_id: quarterId,
          [bodyKey]: bodyValue,
          nota: testo.trim() || null,
          esito: esito || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Errore durante il salvataggio.");
      onSaved({ id: data.id, [bodyKey]: bodyValue, nota: testo.trim() || null, esito: esito || null } as unknown as N);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit && !nota?.nota && !nota?.esito) return null;

  const notaSalvata = Boolean(nota?.nota || nota?.esito);

  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 print:hidden">
      <div className="flex items-center gap-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Nota del revisore
        </label>
        {notaSalvata && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            ✓ Salvata
          </span>
        )}
      </div>
      {canEdit ? (
        <>
          <textarea
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            rows={2}
            placeholder="Annotazioni sull'anomalia rilevata…"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={esito}
            onChange={(e) => setEsito(e.target.value as EsitoNota | "")}
            className="h-8 w-full rounded-md border border-gray-300 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Seleziona esito —</option>
            {ESITO_NOTA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={salva}
              disabled={saving || !dirty}
              className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {saving ? "Salvataggio…" : "Salva"}
            </button>
            {saved && <span className="text-xs text-emerald-600">Salvato</span>}
          </div>
          {errore && <p className="text-xs text-red-600">{errore}</p>}
        </>
      ) : (
        <>
          {nota?.nota && <p className="text-xs leading-relaxed text-gray-700">{nota.nota}</p>}
          {nota?.esito && (
            <p className="text-xs font-medium text-gray-600">
              {ESITO_NOTA_OPTIONS.find((o) => o.value === nota.esito)?.label}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SezioneSalute({
  salute,
  quarterId,
  canEdit,
  note,
  onNotaSaved,
}: {
  salute: Salute;
  quarterId: string;
  canEdit: boolean;
  note: Record<string, SaluteNota>;
  onNotaSaved: (n: SaluteNota) => void;
}) {
  const c = SALUTE[salute.complessivo] ?? SALUTE.non_determinabile;
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Salute dell&apos;azienda</h2>
          <p className="mt-0.5 text-xs text-gray-500">Redditività, equilibrio commerciale e struttura finanziaria del trimestre</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${c.badge}`}>
          <span className={`h-2 w-2 rounded-full ${c.dot}`} />
          {c.label}
        </span>
      </div>

      {salute.giudizio_ai && (
        <div className="border-b border-gray-100 bg-brand-50/40 px-5 py-3">
          <p className="text-sm leading-relaxed text-gray-800">{salute.giudizio_ai}</p>
        </div>
      )}

      <div className="grid gap-px bg-gray-200 sm:grid-cols-3">
        {salute.indicatori.map((ind, i) => {
          const s = SALUTE[ind.stato] ?? SALUTE.non_determinabile;
          const chiave = ind.misure.find((m) => m.evidenza);
          return (
            <div key={i} className="flex flex-col bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{ind.dimensione}</h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
                </span>
              </div>

              {chiave && (
                <div className="mt-2">
                  <div className="text-2xl font-bold tabular-nums text-gray-900">{misura(chiave)}</div>
                  <div className="text-xs text-gray-500">{chiave.etichetta}</div>
                </div>
              )}

              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full w-full ${s.bar}`} />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-gray-600">{ind.domanda}</p>

              <dl className="mt-2 space-y-1">
                {ind.misure.filter((m) => !m.evidenza).map((m, j) => (
                  <div key={j} className="flex justify-between gap-2 text-xs">
                    <dt className="text-gray-500">{m.etichetta}</dt>
                    <dd className="tabular-nums font-medium text-gray-800">{misura(m)}</dd>
                  </div>
                ))}
              </dl>

              {ind.nota && <p className="mt-2 text-xs italic text-amber-700">{ind.nota}</p>}
              <p className={ind.stato === "critico" || ind.stato === "attenzione" ? "pt-3 text-[11px] leading-relaxed text-gray-400" : "mt-auto pt-3 text-[11px] leading-relaxed text-gray-400"}>
                {ind.soglie}
              </p>

              {(ind.stato === "critico" || ind.stato === "attenzione") && (
                <NotaRevisore
                  apiPath="/api/accounting/salute-note"
                  quarterId={quarterId}
                  bodyKey="indicatore"
                  bodyValue={ind.dimensione}
                  nota={note[ind.dimensione]}
                  canEdit={canEdit}
                  onSaved={onNotaSaved}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 px-5 py-2.5">
        <p className="text-[11px] leading-relaxed text-gray-400">{salute.avvertenza}</p>
      </div>
    </section>
  );
}

function CardRiscontro({
  r,
  quarterId,
  canEdit,
  nota,
  onNotaSaved,
}: {
  r: Riscontro;
  quarterId: string;
  canEdit: boolean;
  nota: RiscontroNota | undefined;
  onNotaSaved: (n: RiscontroNota) => void;
}) {
  const c = ESITO[r.esito] ?? ESITO.non_verificabile;
  return (
    <section className={`scroll-mt-4 rounded-xl border border-gray-200 border-l-4 bg-white shadow-sm ${c.bordo}`} id={r.codice}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{r.voce}</h2>
          <p className="mt-0.5 font-mono text-xs text-gray-400">conto {r.codice}</p>
        </div>
        <Badge esito={r.esito} />
      </header>

      <div className="space-y-4 px-5 pb-5">
        <Cifre r={r} />

        {r.commento_ai && (
          <div className="rounded-lg bg-brand-50/60 px-3 py-2.5 ring-1 ring-inset ring-brand-100">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Commento del revisore AI
            </div>
            <p className="text-sm leading-relaxed text-gray-700">{r.commento_ai}</p>
          </div>
        )}

        {r.composizione.length > 1 && (
          <details className="group rounded-lg border border-gray-200">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <span className="group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>{" "}
              Come è composta la voce a bilancio ({r.composizione.length} sotto-conti)
            </summary>
            <table className="w-full border-t border-gray-200 text-xs">
              <tbody>
                {r.composizione.map((v, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-1.5 font-mono text-gray-400">{v.codice}</td>
                    <td className="px-3 py-1.5 text-gray-700">{v.descrizione}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{eur(v.importo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}

        {r.prove.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Prove del confronto
            </h3>
            {r.prove.map((p, i) => <TabellaProva key={i} p={p} />)}
          </div>
        )}

        {r.confronti.map((cf, i) => (
          <div key={i} className="rounded-lg border border-gray-200 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-700">{cf.etichetta}</span>
              <Badge esito={cf.esito} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
              <span>Bilancio: <span className="tabular-nums font-medium text-gray-900">{eur(cf.bilancio)}</span></span>
              <span>{cf.etichetta_riscontrato ?? "Partitario"}: <span className="tabular-nums font-medium text-gray-900">{eur(cf.riscontrato)}</span></span>
              <span>Differenza: <span className="tabular-nums font-medium text-gray-900">{eur(cf.scostamento === null ? null : Math.abs(cf.scostamento))}</span></span>
            </div>
          </div>
        ))}

        {r.note.length > 0 && (
          <ul className="space-y-1.5">
            {r.note.map((n, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-gray-600">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        )}

        {r.esito !== "ok" && (
          <NotaRevisore
            apiPath="/api/accounting/riscontro-note"
            quarterId={quarterId}
            bodyKey="codice"
            bodyValue={r.codice}
            nota={nota}
            canEdit={canEdit}
            onSaved={onNotaSaved}
          />
        )}
      </div>
    </section>
  );
}

// ── Pagina ───────────────────────────────────────────────────────────────────

export default function RevisionePage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string }>;
}) {
  const [ids, setIds] = useState<{ id: string; quarterId: string } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [ricalcolando, setRicalcolando] = useState(false);
  const [canEditNote, setCanEditNote] = useState(false);
  const [saluteNote, setSaluteNote] = useState<Record<string, SaluteNota>>({});
  const [riscontroNote, setRiscontroNote] = useState<Record<string, RiscontroNota>>({});

  useEffect(() => { params.then(setIds); }, [params]);

  // Al primo accesso mostra l'ultima revisione salvata, senza ricalcolare: il ricalcolo è
  // costoso (decine di secondi, chiamate AI incluse) e va richiesto esplicitamente.
  useEffect(() => {
    if (!ids) return;
    let annullato = false;
    (async () => {
      try {
        const res = await fetch(`/api/accounting/review/${ids.quarterId}`);
        if (res.status === 404) {
          // Nessuna revisione calcolata finora per questo trimestre: la prima è automatica.
          if (!annullato) await ricalcola(ids.quarterId, annullato);
          return;
        }
        const data = await res.json();
        if (annullato) return;
        if (!res.ok) throw new Error(data?.error ?? "Errore nel recupero della revisione.");
        setReport(data);
      } catch (e) {
        if (!annullato) setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      }
    })();
    return () => { annullato = true; };
  }, [ids]);

  async function ricalcola(quarterId: string, giaAnnullato = false) {
    setRicalcolando(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/accounting/review/${quarterId}`, { method: "POST" });
      const data = await res.json();
      if (giaAnnullato) return;
      if (!res.ok) throw new Error(data?.error ?? "Errore nella revisione.");
      setReport(data);
    } catch (e) {
      if (!giaAnnullato) setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      if (!giaAnnullato) setRicalcolando(false);
    }
  }

  useEffect(() => {
    if (!ids) return;
    let annullato = false;
    (async () => {
      const [meRes, noteRes, riscontroNoteRes] = await Promise.all([
        fetch("/api/auth/me").catch(() => null),
        fetch(`/api/accounting/salute-note?quarter_id=${ids.quarterId}`).catch(() => null),
        fetch(`/api/accounting/riscontro-note?quarter_id=${ids.quarterId}`).catch(() => null),
      ]);
      if (annullato) return;
      if (meRes?.ok) {
        const me = await meRes.json();
        if (!annullato) setCanEditNote(["tenant_owner", "revisor"].includes(me?.profile?.role));
      }
      if (noteRes?.ok) {
        const note: SaluteNota[] = await noteRes.json();
        if (!annullato) {
          setSaluteNote(Object.fromEntries(note.map((n) => [n.indicatore, n])));
        }
      }
      if (riscontroNoteRes?.ok) {
        const note: RiscontroNota[] = await riscontroNoteRes.json();
        if (!annullato) {
          setRiscontroNote(Object.fromEntries(note.map((n) => [n.codice, n])));
        }
      }
    })();
    return () => { annullato = true; };
  }, [ids]);

  const conteggio = (e: Esito) => report?.riscontri.filter((r) => r.esito === e).length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Intestazione */}
      <div className="print:hidden">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/incarichi" className="hover:text-brand-600">Incarichi</Link>
          <span>›</span>
          {ids && (
            <Link href={`/incarichi/${ids.id}/trimestri/${ids.quarterId}`} className="hover:text-brand-600">
              Trimestre
            </Link>
          )}
          <span>›</span>
          <span className="text-gray-600">Revisione</span>
        </div>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revisione del trimestre</h1>
          {report && (
            <p className="mt-1 text-sm text-gray-500">
              {report.meta.denominazione ?? "—"}
              {report.meta.data_bilancio && ` · bilancio al ${report.meta.data_bilancio}`}
              {` · ${report.documenti_analizzati} documenti analizzati`}
              {report.computed_at && ` · calcolata il ${new Date(report.computed_at).toLocaleString("it-IT")}`}
            </p>
          )}
        </div>
        {report && ids && (
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => ricalcola(ids.quarterId)}
              disabled={ricalcolando}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {ricalcolando ? "Ricalcolo in corso…" : "Ricalcola"}
            </button>
            <Link
              href={`/incarichi/${ids.id}/trimestri/${ids.quarterId}/revisione/stampa`}
              onClick={() => {
                try {
                  sessionStorage.setItem(`carta-lavoro-report-${ids.quarterId}`, JSON.stringify(report));
                } catch {
                  // sessionStorage non disponibile: la pagina di stampa ricalcolerà la revisione
                }
              }}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Genera carta di lavoro
            </Link>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Stampa
            </button>
          </div>
        )}
      </header>

      {/* Caricamento (solo al primo accesso: il ricalcolo esplicito non nasconde il report precedente) */}
      {!report && !errore && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16">
          <svg className="h-7 w-7 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-gray-700">Riconciliazione in corso…</p>
          <p className="max-w-sm text-center text-xs text-gray-500">
            Lettura del bilancio, dei registri IVA, dei mastrini e della LIPE. Gli importi
            vengono estratti e sommati dai documenti; può richiedere una trentina di secondi.
          </p>
        </div>
      )}

      {errore && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          style={{ whiteSpace: "pre-line" }}
        >
          {errore}
        </div>
      )}

      {report && (
        <>
          {/* Sintesi */}
          {report.sintesi_ai && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-5 py-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Sintesi
              </div>
              <p className="text-sm leading-relaxed text-gray-800">{report.sintesi_ai}</p>
            </div>
          )}

          {/* Salute dell'azienda */}
          {report.salute && ids && (
            <SezioneSalute
              salute={report.salute}
              quarterId={ids.quarterId}
              canEdit={canEditNote}
              note={saluteNote}
              onNotaSaved={(n) => setSaluteNote((prev) => ({ ...prev, [n.indicatore]: n }))}
            />
          )}

          {/* Quadro di sintesi */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Quadro di sintesi</h2>
              <div className="flex gap-3 text-xs text-gray-500">
                <span><span className="font-semibold text-emerald-600">{conteggio("ok")}</span> riscontrate</span>
                <span><span className="font-semibold text-red-600">{conteggio("scostamento")}</span> con scostamento</span>
                <span><span className="font-semibold text-amber-600">{conteggio("non_verificabile")}</span> non verificabili</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="px-5 py-2 text-left font-medium">Voce</th>
                    <th className="px-3 py-2 text-right font-medium">Bilancio</th>
                    <th className="px-3 py-2 text-right font-medium">Riscontrato</th>
                    <th className="px-3 py-2 text-right font-medium">Scostamento</th>
                    <th className="px-5 py-2 text-left font-medium">Esito</th>
                  </tr>
                </thead>
                <tbody>
                  {report.riscontri.map((r) => (
                    <tr key={r.codice} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-2.5">
                        <a href={`#${r.codice}`} className="font-medium text-gray-900 hover:text-brand-600">{r.voce}</a>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{eur(r.valore_bilancio)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{eur(r.valore_riscontrato)}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${r.esito === "scostamento" ? "font-semibold text-red-600" : "text-gray-700"}`}>
                        {r.scostamento === null ? "—" : eur(Math.abs(r.scostamento))}
                      </td>
                      <td className="px-5 py-2.5"><Badge esito={r.esito} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Anomalie del bilancio */}
          {report.anomalie?.length > 0 && (
            <section className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
              <h2 className="mb-2 text-sm font-semibold text-red-800">Anomalie rilevate nel bilancio</h2>
              <ul className="space-y-1">
                {report.anomalie.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm text-red-700">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-500" />
                    <span>{a.messaggio}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Dettaglio voce per voce */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Dettaglio delle verifiche
            </h2>
            {report.riscontri.map((r) => (
              <CardRiscontro
                key={r.codice}
                r={r}
                quarterId={ids?.quarterId ?? ""}
                canEdit={canEditNote}
                nota={riscontroNote[r.codice]}
                onNotaSaved={(n) => setRiscontroNote((prev) => ({ ...prev, [n.codice]: n }))}
              />
            ))}
          </div>

          {/* Nota di metodo */}
          <footer className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-xs leading-relaxed text-gray-600">
            <p className="mb-1 font-semibold text-gray-700">Nota di metodo</p>
            <p>
              Tutti gli importi di questo report sono stati letti dai documenti e sommati in
              codice: <strong>nessun valore è prodotto da un modello linguistico</strong>. L&apos;AI
              interviene solo per il commento discorsivo. Ogni riscontro riporta le righe usate e
              il documento di provenienza, così che il calcolo possa essere rifatto a mano.
            </p>
            {!report.ai_used && (
              <p className="mt-2 text-amber-700">
                Il commento AI non è disponibile{report.ai_error ? ` (${report.ai_error})` : ""}:
                i riscontri restano comunque completi e verificati.
              </p>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
