"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export interface AreaSummary {
  key: string;
  label: string;
  riskLevel: "high" | "medium" | "low" | "unknown";
  accountCount: number;
  balance: number;
  balancePrev: number;
  variationPct: number | null;
  significantCount: number;
  criticalCount: number;
  topAccounts: {
    account_code: string | null;
    account_name: string;
    balance: number;
    balance_prev: number | null;
    variationPct: number | null;
  }[];
}

const RISK_CONFIG = {
  high:    { label: "Alto rischio",    badge: "bg-red-100 text-red-800 border border-red-200",     bar: "bg-red-500",    icon: "⚠" },
  medium:  { label: "Rischio medio",   badge: "bg-orange-100 text-orange-800 border border-orange-200", bar: "bg-orange-400", icon: "!" },
  low:     { label: "Basso rischio",   badge: "bg-emerald-100 text-emerald-800 border border-emerald-200", bar: "bg-emerald-400", icon: "✓" },
  unknown: { label: "Da verificare",   badge: "bg-gray-100 text-gray-600 border border-gray-200",   bar: "bg-gray-300",   icon: "?" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function AnalisiRischio({
  areas,
  importId,
  assignmentId,
  quarterId,
  hasPrev,
}: {
  areas: AreaSummary[];
  importId: string;
  assignmentId: string;
  quarterId: string;
  hasPrev: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ created: number; quarter_id?: string; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [generatingRilievi, setGeneratingRilievi] = useState(false);
  const [rilieviResult, setRilieviResult] = useState<{ created: number; message?: string } | null>(null);
  const [rilieviError, setRilieviError] = useState<string | null>(null);
  const [generatingCirc, setGeneratingCirc] = useState(false);
  const [circResult, setCircResult] = useState<string | null>(null);

  const highCount   = areas.filter((a) => a.riskLevel === "high").length;
  const mediumCount = areas.filter((a) => a.riskLevel === "medium").length;
  const lowCount    = areas.filter((a) => a.riskLevel === "low").length;

  const hasCrediti = areas.some(
    (a) => (a.key === "crediti" || a.key === "altri_crediti") &&
            (a.riskLevel === "high" || a.riskLevel === "medium"),
  );

  async function handleGeneraRilievi() {
    setRilieviError(null);
    setRilieviResult(null);
    setGeneratingRilievi(true);
    const res = await fetch(`/api/tenant/accounting-imports/${importId}/rilievi`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setGeneratingRilievi(false);
    if (!res.ok) {
      setRilieviError(typeof data.error === "string" ? data.error : "Errore durante la generazione.");
      return;
    }
    setRilieviResult(data);
  }

  async function handleCircolarizzazione() {
    setGeneratingCirc(true);
    setCircResult(null);
    const creditiArea = areas.find((a) => a.key === "crediti");
    const topAccounts = creditiArea?.topAccounts ?? [];
    const title = `Lettera di circolarizzazione crediti — ${new Date().getFullYear()}`;
    const content =
      `LETTERA DI CIRCOLARIZZAZIONE CREDITI\n` +
      `(ISA 505 — Conferme esterne)\n\n` +
      `Spett.le [NOME DEBITORE],\n\n` +
      `La presente per comunicarVi che la società [NOME SOCIETÀ] è sottoposta a revisione legale dei conti.\n` +
      `Il revisore incaricato, ai sensi del principio ISA 505, richiede la conferma dei seguenti saldi al [DATA]:\n\n` +
      (topAccounts.length > 0
        ? topAccounts
            .map((a) => `• ${a.account_name}: € ${new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2 }).format(a.balance)}`)
            .join("\n")
        : "• [indicare i crediti da circolarizzare]") +
      `\n\nSi prega di confermare l'esattezza del saldo sopra indicato apponendo la firma e restituendo il presente documento entro [DATA RISPOSTA] al seguente indirizzo: [INDIRIZZO/EMAIL REVISORE].\n\n` +
      `In caso di discordanza, indicare il saldo da Voi risultante e le relative differenze.\n\n` +
      `Distinti saluti,\n\n[NOME REVISORE]\n[STUDIO/QUALIFICA]\n[CONTATTI]`;

    const res = await fetch("/api/tenant/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId, title, type: "lettera_direzione", content }),
    });
    setGeneratingCirc(false);
    if (!res.ok) {
      setCircResult("error");
      return;
    }
    const { id } = await res.json();
    window.location.href = `/incarichi/${assignmentId}/bozze/${id}`;
  }

  async function handleGenera() {
    setError(null);
    setResult(null);
    setGenerating(true);
    const res = await fetch(`/api/tenant/accounting-imports/${importId}/analisi`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setGenerating(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Errore durante la generazione.");
      return;
    }
    setResult(data);
  }

  return (
    <div className="space-y-5">
      {/* Intestazione + riepilogo */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analisi Aree di Rischio</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {hasPrev
              ? "Classificazione automatica dei conti per area con valutazione del rischio basata sulle variazioni."
              : "Nessun saldo precedente disponibile. Le aree sono classificate ma il rischio non può essere calcolato."}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          {highCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {highCount} {highCount === 1 ? "area ad alto rischio" : "aree ad alto rischio"}
            </span>
          )}
          {mediumCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              {mediumCount} a rischio medio
            </span>
          )}
          {lowCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {lowCount} a basso rischio
            </span>
          )}
        </div>
      </div>

      {/* Aree */}
      <div className="space-y-2">
        {areas.map((area) => {
          const cfg = RISK_CONFIG[area.riskLevel];
          const isOpen = expanded === area.key;
          return (
            <div
              key={area.key}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              {/* Header area */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : area.key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                {/* Indicatore rischio */}
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.bar}`} />

                <span className="flex-1 font-medium text-gray-900">{area.label}</span>

                <span className="text-xs text-gray-400">
                  {area.accountCount} {area.accountCount === 1 ? "conto" : "conti"}
                </span>

                {area.variationPct !== null && (
                  <span className={`text-sm font-semibold tabular-nums ${
                    Math.abs(area.variationPct) >= 30 ? "text-red-600" :
                    Math.abs(area.variationPct) >= 15 ? "text-orange-600" :
                    Math.abs(area.variationPct) >= 5  ? "text-yellow-600" :
                    "text-emerald-600"
                  }`}>
                    {area.variationPct >= 0 ? "+" : ""}{area.variationPct.toFixed(1)}%
                  </span>
                )}

                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
                  {cfg.label}
                </span>

                {area.significantCount > 0 && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {area.significantCount} var. ≥15%
                  </span>
                )}

                <svg
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dettaglio espanso */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 mb-3">
                    <div className="rounded-md bg-gray-50 p-2 text-center">
                      <p className="text-xs text-gray-500">Saldo attuale</p>
                      <p className="font-semibold text-gray-900">{fmt(area.balance)}</p>
                    </div>
                    {area.balancePrev !== 0 && (
                      <div className="rounded-md bg-gray-50 p-2 text-center">
                        <p className="text-xs text-gray-500">Saldo precedente</p>
                        <p className="font-semibold text-gray-600">{fmt(area.balancePrev)}</p>
                      </div>
                    )}
                    {area.significantCount > 0 && (
                      <div className="rounded-md bg-orange-50 p-2 text-center">
                        <p className="text-xs text-orange-600">Var. significative</p>
                        <p className="font-semibold text-orange-700">{area.significantCount}</p>
                      </div>
                    )}
                    {area.criticalCount > 0 && (
                      <div className="rounded-md bg-red-50 p-2 text-center">
                        <p className="text-xs text-red-600">Var. critiche ≥30%</p>
                        <p className="font-semibold text-red-700">{area.criticalCount}</p>
                      </div>
                    )}
                  </div>

                  {area.topAccounts.length > 0 && (
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-1.5 text-left font-medium text-gray-500">Conto</th>
                          <th className="pb-1.5 text-right font-medium text-gray-500">Saldo</th>
                          {hasPrev && <th className="pb-1.5 text-right font-medium text-gray-500">Prec.</th>}
                          {hasPrev && <th className="pb-1.5 text-right font-medium text-gray-500">Var.%</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {area.topAccounts.map((acc, i) => (
                          <tr key={i}>
                            <td className="py-1 text-gray-700">
                              {acc.account_code && <span className="mr-1 font-mono text-gray-400">{acc.account_code}</span>}
                              {acc.account_name}
                            </td>
                            <td className="py-1 text-right font-mono text-gray-900">{fmt(acc.balance)}</td>
                            {hasPrev && (
                              <td className="py-1 text-right font-mono text-gray-400">
                                {acc.balance_prev !== null ? fmt(acc.balance_prev) : "—"}
                              </td>
                            )}
                            {hasPrev && (
                              <td className={`py-1 text-right font-mono font-semibold ${
                                acc.variationPct === null ? "text-gray-400" :
                                Math.abs(acc.variationPct) >= 30 ? "text-red-600" :
                                Math.abs(acc.variationPct) >= 15 ? "text-orange-600" :
                                "text-gray-600"
                              }`}>
                                {acc.variationPct !== null
                                  ? `${acc.variationPct >= 0 ? "+" : ""}${acc.variationPct.toFixed(1)}%`
                                  : "Nuovo"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Azione genera */}
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-brand-900">Genera Piano di Revisione</h3>
            <p className="mt-0.5 text-sm text-brand-700">
              Crea automaticamente le carte di lavoro per ogni area a rischio, pre-compilate
              con i conti rilevanti e le procedure di revisione standard.
            </p>
          </div>
          <Button
            type="button"
            loading={generating}
            onClick={handleGenera}
            disabled={!!result}
          >
            {result ? "Piano generato ✓" : "Genera Piano di Revisione"}
          </Button>
        </div>

        {error && <Alert tone="error" className="mt-3">{error}</Alert>}

        {result && (
          <Alert tone="success" className="mt-3">
            {result.created > 0 ? (
              <>
                <strong>{result.created} {result.created === 1 ? "carta di lavoro creata" : "carte di lavoro create"}</strong>
                {" "}per le aree a rischio.{" "}
                <Link
                  href={`/incarichi/${assignmentId}/trimestri/${quarterId}`}
                  className="font-semibold underline"
                >
                  Vai al trimestre per iniziare la revisione →
                </Link>
              </>
            ) : (
              result.message ?? "Operazione completata."
            )}
          </Alert>
        )}
      </div>

      {/* Genera Rilievi automatici */}
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-orange-900">Genera Rilievi Automatici</h3>
            <p className="mt-0.5 text-sm text-orange-700">
              Analizza le variazioni significative e crea automaticamente i rilievi nella sezione
              Rilievi del trimestre, con severità bassa / media / alta / critica.
            </p>
          </div>
          <Button
            type="button"
            loading={generatingRilievi}
            onClick={handleGeneraRilievi}
            disabled={!!rilieviResult}
            variant="secondary"
          >
            {rilieviResult ? "Rilievi generati ✓" : "Genera Rilievi"}
          </Button>
        </div>
        {rilieviError && <Alert tone="error" className="mt-3">{rilieviError}</Alert>}
        {rilieviResult && (
          <Alert tone="success" className="mt-3">
            {rilieviResult.created > 0 ? (
              <>
                <strong>{rilieviResult.created} {rilieviResult.created === 1 ? "rilievo creato" : "rilievi creati"}</strong>
                {" "}nel trimestre.{" "}
                <Link
                  href={`/incarichi/${assignmentId}/trimestri/${quarterId}`}
                  className="font-semibold underline"
                >
                  Vai al trimestre per visualizzarli →
                </Link>
              </>
            ) : (
              rilieviResult.message ?? "Operazione completata."
            )}
          </Alert>
        )}
      </div>

      {/* Circolarizzazione crediti — solo se area crediti a rischio */}
      {hasCrediti && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-blue-900">Genera Lettera di Circolarizzazione</h3>
              <p className="mt-0.5 text-sm text-blue-700">
                L&apos;area crediti presenta variazioni significative. Genera la lettera di conferma
                esterna da inviare ai debitori (ISA 505), pre-compilata con i conti rilevanti.
              </p>
            </div>
            <Button
              type="button"
              loading={generatingCirc}
              onClick={handleCircolarizzazione}
              variant="secondary"
            >
              Genera Circolarizzazione
            </Button>
          </div>
          {circResult === "error" && (
            <Alert tone="error" className="mt-3">Errore durante la generazione della lettera.</Alert>
          )}
        </div>
      )}
    </div>
  );
}
