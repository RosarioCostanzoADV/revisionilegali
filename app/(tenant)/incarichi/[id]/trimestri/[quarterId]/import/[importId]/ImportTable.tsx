"use client";

import { useState } from "react";

interface Entry {
  id: string;
  account_code: string | null;
  account_name: string;
  balance: number;
  balance_prev: number | null;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function variationClass(pct: number | null): string {
  if (pct === null) return "";
  const abs = Math.abs(pct);
  if (abs >= 30) return "bg-red-50 text-red-700 font-semibold";
  if (abs >= 15) return "bg-orange-50 text-orange-700";
  if (abs >= 5) return "bg-yellow-50 text-yellow-700";
  return "text-gray-600";
}

export function ImportTable({
  entries,
  importId,
  assignmentId,
  quarterId,
  canDelete,
}: {
  entries: Entry[];
  importId: string;
  assignmentId: string;
  quarterId: string;
  canDelete: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [showOnlySignificant, setShowOnlySignificant] = useState(false);

  const filtered = entries.filter((e) => {
    const matchText =
      !filter ||
      e.account_name.toLowerCase().includes(filter.toLowerCase()) ||
      (e.account_code ?? "").toLowerCase().includes(filter.toLowerCase()) ||
      fmt(e.balance).includes(filter) ||
      e.balance.toString().includes(filter.replace(",", "."));

    const pct =
      e.balance_prev && e.balance_prev !== 0
        ? ((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100
        : null;

    const matchSignificant = !showOnlySignificant || (pct !== null && Math.abs(pct) >= 15);

    return matchText && matchSignificant;
  });

  const total = entries.reduce((s, e) => s + e.balance, 0);
  const totalPrev = entries.reduce((s, e) => s + (e.balance_prev ?? 0), 0);
  const hasPrev = entries.some((e) => e.balance_prev !== null);

  const significantCount = entries.filter((e) => {
    if (!e.balance_prev || e.balance_prev === 0) return false;
    const pct = Math.abs(((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100);
    return pct >= 15;
  }).length;

  function exportCSV() {
    const header = ["Codice", "Descrizione", "Saldo", hasPrev ? "Saldo Prec." : null, hasPrev ? "Var. €" : null, hasPrev ? "Var. %" : null]
      .filter(Boolean).join(";");
    const rows = entries.map((e) => {
      const diff = e.balance_prev !== null ? e.balance - e.balance_prev : null;
      const pct = e.balance_prev && e.balance_prev !== 0
        ? ((e.balance - e.balance_prev) / Math.abs(e.balance_prev) * 100).toFixed(1)
        : null;
      return [
        e.account_code ?? "",
        e.account_name,
        e.balance.toFixed(2),
        hasPrev ? (e.balance_prev?.toFixed(2) ?? "") : null,
        hasPrev ? (diff?.toFixed(2) ?? "") : null,
        hasPrev ? (pct ?? "") : null,
      ].filter((_, i) => hasPrev || i < 3).join(";");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_${importId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Riepilogo */}
      {hasPrev && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className="text-xs text-gray-500">Conti totali</p>
            <p className="text-lg font-bold text-gray-900">{entries.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className="text-xs text-gray-500">Variazioni &gt;15%</p>
            <p className={`text-lg font-bold ${significantCount > 0 ? "text-orange-600" : "text-gray-900"}`}>
              {significantCount}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className="text-xs text-gray-500">Totale saldo</p>
            <p className="text-sm font-bold text-gray-900">{fmt(total)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className="text-xs text-gray-500">Variazione totale</p>
            <p className={`text-sm font-bold ${total - totalPrev >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {total - totalPrev >= 0 ? "+" : ""}{fmt(total - totalPrev)}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Cerca conto..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 w-56 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {hasPrev && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlySignificant}
                onChange={(e) => setShowOnlySignificant(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              Solo variazioni significative (≥15%)
            </label>
          )}
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Esporta CSV
        </button>
      </div>

      {/* Tabella */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-3 text-left w-24">Codice</th>
              <th className="px-3 py-3 text-left">Descrizione</th>
              <th className="px-3 py-3 text-right">Saldo</th>
              {hasPrev && <th className="px-3 py-3 text-right">Saldo Prec.</th>}
              {hasPrev && <th className="px-3 py-3 text-right">Var. €</th>}
              {hasPrev && <th className="px-3 py-3 text-right w-24">Var. %</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((e) => {
              const diff = e.balance_prev !== null ? e.balance - e.balance_prev : null;
              const pct =
                e.balance_prev && e.balance_prev !== 0
                  ? ((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100
                  : null;
              const rowClass = pct !== null && Math.abs(pct) >= 30 ? "bg-red-50" :
                pct !== null && Math.abs(pct) >= 15 ? "bg-orange-50" : "";

              return (
                <tr key={e.id} className={`hover:bg-gray-50 ${rowClass}`}>
                  <td className="px-3 py-2 text-gray-400 font-mono text-xs">{e.account_code ?? ""}</td>
                  <td className="px-3 py-2 text-gray-800">{e.account_name}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">{fmt(e.balance)}</td>
                  {hasPrev && (
                    <td className="px-3 py-2 text-right font-mono text-gray-400">
                      {e.balance_prev !== null ? fmt(e.balance_prev) : "—"}
                    </td>
                  )}
                  {hasPrev && (
                    <td className={`px-3 py-2 text-right font-mono ${diff !== null ? (diff >= 0 ? "text-emerald-700" : "text-red-700") : "text-gray-400"}`}>
                      {diff !== null ? `${diff >= 0 ? "+" : ""}${fmt(diff)}` : "—"}
                    </td>
                  )}
                  {hasPrev && (
                    <td className={`px-3 py-2 text-right text-xs ${variationClass(pct)}`}>
                      {pct !== null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "Nuovo"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {/* Totali */}
          <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-sm">
            <tr>
              <td className="px-3 py-3" colSpan={2}>TOTALE ({filtered.length} conti)</td>
              <td className="px-3 py-3 text-right font-mono">
                {fmt(filtered.reduce((s, e) => s + e.balance, 0))}
              </td>
              {hasPrev && (
                <td className="px-3 py-3 text-right font-mono text-gray-500">
                  {fmt(filtered.reduce((s, e) => s + (e.balance_prev ?? 0), 0))}
                </td>
              )}
              {hasPrev && (() => {
                const tot = filtered.reduce((s, e) => s + e.balance, 0);
                const totP = filtered.reduce((s, e) => s + (e.balance_prev ?? 0), 0);
                const d = tot - totP;
                return (
                  <>
                    <td className={`px-3 py-3 text-right font-mono ${d >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {d >= 0 ? "+" : ""}{fmt(d)}
                    </td>
                    <td className="px-3 py-3" />
                  </>
                );
              })()}
            </tr>
          </tfoot>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">Nessun conto corrisponde ai filtri.</p>
      )}
    </div>
  );
}
