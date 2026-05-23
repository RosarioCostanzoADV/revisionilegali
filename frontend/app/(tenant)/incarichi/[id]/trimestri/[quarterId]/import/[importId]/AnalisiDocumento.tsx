"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface Entry {
  id: string;
  account_code: string | null;
  account_name: string;
  balance: number;
  balance_prev: number | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const DOC_TYPE_CONFIG: Record<string, { title: string; description: string; color: string }> = {
  estratto_conto: {
    title: "Riconciliazione Bancaria",
    description: "Confronto tra i saldi dell'estratto conto e i conti disponibilità liquide nel bilancio. Genera i rilievi per ogni saldo non riconciliato.",
    color: "blue",
  },
  rimanenze: {
    title: "Analisi Rimanenze",
    description: "Verifica della coerenza delle rimanenze rispetto al fatturato e all'esercizio precedente. Genera rilievi se il rapporto è anomalo.",
    color: "amber",
  },
  registro_iva: {
    title: "Analisi Registro IVA",
    description: "Controllo del rapporto IVA/imponibile e verifica della coerenza delle aliquote applicate.",
    color: "purple",
  },
  libro_giornale: {
    title: "Analisi Libro Giornale",
    description: "Statistiche sulle registrazioni contabili. Evidenzia importi anomali o movimenti inusuali.",
    color: "gray",
  },
  altro: {
    title: "Documento importato",
    description: "Documento generico. Usa il tasto Genera Rilievi per analizzare le voci e creare automaticamente i rilievi.",
    color: "gray",
  },
};

export function AnalisiDocumento({
  docType,
  importId,
  assignmentId,
  quarterId,
  entries,
}: {
  docType: string;
  importId: string;
  assignmentId: string;
  quarterId: string;
  entries: Entry[];
}) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ created: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cfg = DOC_TYPE_CONFIG[docType] ?? DOC_TYPE_CONFIG.altro!;

  async function handleGeneraRilievi() {
    setError(null);
    setResult(null);
    setGenerating(true);
    const res = await fetch(`/api/accounting/imports/${importId}/rilievi`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setGenerating(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Errore durante la generazione.");
      return;
    }
    setResult(data);
  }

  // ── Statistiche per tipo ──────────────────────────────────────────────────
  const totalBalance = entries.reduce((s, e) => s + e.balance, 0);
  const totalPrev = entries.reduce((s, e) => s + (e.balance_prev ?? 0), 0);
  const hasPrev = entries.some((e) => e.balance_prev !== null);
  const varPct = hasPrev && totalPrev !== 0
    ? ((totalBalance - totalPrev) / Math.abs(totalPrev)) * 100
    : null;

  // Conti con variazione >20%
  const anomali = entries
    .filter((e) => {
      if (!e.balance_prev || e.balance_prev === 0) return false;
      return Math.abs(((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100) >= 20;
    })
    .map((e) => ({
      ...e,
      pct: ((e.balance - e.balance_prev!) / Math.abs(e.balance_prev!)) * 100,
    }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 8);

  const colorMap: Record<string, string> = {
    blue:   "border-blue-200 bg-blue-50",
    amber:  "border-amber-200 bg-amber-50",
    purple: "border-purple-200 bg-purple-50",
    gray:   "border-gray-200 bg-gray-50",
  };
  const titleColorMap: Record<string, string> = {
    blue:   "text-blue-900",
    amber:  "text-amber-900",
    purple: "text-purple-900",
    gray:   "text-gray-900",
  };
  const descColorMap: Record<string, string> = {
    blue:   "text-blue-700",
    amber:  "text-amber-700",
    purple: "text-purple-700",
    gray:   "text-gray-600",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{cfg.title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{cfg.description}</p>
      </div>

      {/* Riepilogo numerico */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">Voci importate</p>
          <p className="text-xl font-bold text-gray-900">{entries.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">Totale saldo</p>
          <p className="text-sm font-bold text-gray-900 tabular-nums">{fmt(totalBalance)}</p>
        </div>
        {hasPrev && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-500">Saldo precedente</p>
            <p className="text-sm font-bold text-gray-600 tabular-nums">{fmt(totalPrev)}</p>
          </div>
        )}
        {varPct !== null && (
          <div className={`rounded-lg border p-3 text-center ${Math.abs(varPct) >= 30 ? "border-red-200 bg-red-50" : Math.abs(varPct) >= 15 ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50"}`}>
            <p className="text-xs text-gray-500">Variazione</p>
            <p className={`text-sm font-bold tabular-nums ${Math.abs(varPct) >= 30 ? "text-red-700" : Math.abs(varPct) >= 15 ? "text-orange-700" : "text-emerald-700"}`}>
              {varPct >= 0 ? "+" : ""}{varPct.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Voci anomale */}
      {anomali.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Voci con variazione significativa (&ge;20%)
          </h3>
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-1.5 text-left font-medium text-gray-500">Voce</th>
                <th className="pb-1.5 text-right font-medium text-gray-500">Saldo</th>
                {hasPrev && <th className="pb-1.5 text-right font-medium text-gray-500">Prec.</th>}
                <th className="pb-1.5 text-right font-medium text-gray-500">Var.%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {anomali.map((e) => (
                <tr key={e.id}>
                  <td className="py-1.5 text-gray-700">
                    {e.account_code && <span className="mr-1 font-mono text-gray-400">{e.account_code}</span>}
                    {e.account_name}
                  </td>
                  <td className="py-1.5 text-right font-mono text-gray-900">{fmt(e.balance)}</td>
                  {hasPrev && (
                    <td className="py-1.5 text-right font-mono text-gray-400">
                      {e.balance_prev !== null ? fmt(e.balance_prev) : "—"}
                    </td>
                  )}
                  <td className={`py-1.5 text-right font-mono font-semibold ${Math.abs(e.pct) >= 30 ? "text-red-600" : "text-orange-600"}`}>
                    {e.pct >= 0 ? "+" : ""}{e.pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Azione principale */}
      <div className={`rounded-lg border p-4 ${colorMap[cfg.color] ?? colorMap.gray}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className={`font-semibold ${titleColorMap[cfg.color] ?? titleColorMap.gray}`}>
              Genera Rilievi Automatici
            </h3>
            <p className={`mt-0.5 text-sm ${descColorMap[cfg.color] ?? descColorMap.gray}`}>
              Il sistema analizza le anomalie e crea i rilievi nella sezione Rilievi del trimestre
              con severità bassa / media / alta / critica.
            </p>
          </div>
          <Button
            type="button"
            loading={generating}
            onClick={handleGeneraRilievi}
            disabled={!!result}
            variant="secondary"
          >
            {result ? "Rilievi generati ✓" : "Genera Rilievi"}
          </Button>
        </div>

        {error && <Alert tone="error" className="mt-3">{error}</Alert>}

        {result && (
          <Alert tone="success" className="mt-3">
            {result.created > 0 ? (
              <>
                <strong>{result.created} {result.created === 1 ? "rilievo creato" : "rilievi creati"}</strong>
                {" "}nel trimestre.{" "}
                <Link
                  href={`/incarichi/${assignmentId}/trimestri/${quarterId}`}
                  className="font-semibold underline"
                >
                  Vai al trimestre →
                </Link>
              </>
            ) : (
              result.message ?? "Operazione completata."
            )}
          </Alert>
        )}
      </div>
    </div>
  );
}
