"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const DOC_TYPES = [
  { value: "bilancio_verifica", label: "Bilancio di verifica" },
  { value: "estratto_conto",   label: "Estratto conto bancario" },
  { value: "rimanenze",        label: "Dettaglio rimanenze" },
  { value: "registro_iva",     label: "Registro IVA" },
  { value: "libro_giornale",   label: "Libro giornale" },
  { value: "altro",            label: "Altro documento" },
];

const SCHEMA_LABELS: Record<string, { label: string; color: string }> = {
  SP_A:      { label: "SP Attivo",   color: "bg-blue-100 text-blue-700" },
  SP_P:      { label: "SP Passivo",  color: "bg-purple-100 text-purple-700" },
  CE:        { label: "Conto Ec.",   color: "bg-amber-100 text-amber-700" },
  CE_RICAVI: { label: "CE Ricavi",   color: "bg-emerald-100 text-emerald-700" },
  CE_COSTI:  { label: "CE Costi",    color: "bg-orange-100 text-orange-700" },
  MEMO:      { label: "Memo",        color: "bg-gray-100 text-gray-500" },
};

/** Restituisce la chiave badge per schema+audit_area: distingue CE Ricavi da CE Costi. */
function schemaBadgeKey(e: EnrichedEntry): string | null {
  if (!e.schema_civilistico) return null;
  if (e.schema_civilistico === "CE") {
    return e.audit_area === "ricavi" ? "CE_RICAVI" : "CE_COSTI";
  }
  return e.schema_civilistico;
}

interface EnrichedEntry {
  account_code: string | null;
  account_name: string;
  balance: number;
  balance_prev: number | null;
  voce_standard: string | null;
  schema_civilistico: string | null;
  audit_area: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function ImportWizard({
  quarterId,
  assignmentId,
}: {
  quarterId: string;
  assignmentId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<EnrichedEntry[]>([]);
  const [aiUsed, setAiUsed] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [docType, setDocType] = useState("bilancio_verifica");
  const [periodLabel, setPeriodLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [filename, setFilename] = useState("");

  // Filtro per schema nel riepilogo
  const [schemaFilter, setSchemaFilter] = useState<string>("tutti");

  // ── Step 1: analizza file ─────────────────────────────────────────────────
  async function handleAnalyze(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) { setError("Seleziona un file."); return; }

    setFilename(file.name);
    setAnalyzing(true);

    const res = await fetch("/api/accounting/imports/ai-preview", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    setAnalyzing(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Errore durante l'analisi del file.");
      return;
    }

    setEntries(data.entries ?? []);
    setAiUsed(data.ai_used ?? false);
    setAiError(data.ai_error ?? null);
    setStep(2);
  }

  // ── Step 2: conferma e salva ──────────────────────────────────────────────
  async function handleConfirm() {
    if (!periodLabel.trim()) { setError("Inserisci il periodo di riferimento."); return; }
    setError(null);
    setSaving(true);

    const res = await fetch("/api/accounting/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignment_id: assignmentId,
        quarter_id: quarterId,
        period_label: periodLabel,
        notes,
        doc_type: docType,
        filename,
        entries,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }

    router.push(`/incarichi/${assignmentId}/trimestri/${quarterId}/import/${data.id}`);
  }

  // ── Statistiche per step 2 ────────────────────────────────────────────────
  const schemaCounts = {
    SP_A: entries.filter((e) => e.schema_civilistico === "SP_A").length,
    SP_P: entries.filter((e) => e.schema_civilistico === "SP_P").length,
    CE:   entries.filter((e) => e.schema_civilistico === "CE").length,
  };
  const schemaTotals = {
    SP_A: entries.filter((e) => e.schema_civilistico === "SP_A").reduce((s, e) => s + e.balance, 0),
    SP_P: entries.filter((e) => e.schema_civilistico === "SP_P").reduce((s, e) => s + e.balance, 0),
    CE:   entries.filter((e) => e.schema_civilistico === "CE").reduce((s, e) => s + e.balance, 0),
  };
  // Separazione CE in ricavi vs costi tramite audit_area classificato dall'AI
  const ricaviTotal = entries
    .filter((e) => e.schema_civilistico === "CE" && e.audit_area === "ricavi")
    .reduce((s, e) => s + e.balance, 0);
  const costiTotal = entries
    .filter((e) => e.schema_civilistico === "CE" && e.audit_area !== "ricavi")
    .reduce((s, e) => s + e.balance, 0);
  // In bilancio di verifica infra-annuale l'utile del periodo non è iscritto in PN:
  //  - SP: emerge come differenza Attivo − (Passivo+PN)
  //  - CE: emerge come differenza Ricavi − Costi
  // Il bilancio è quadrato se le due differenze coincidono.
  const utilePeriodoSP = schemaTotals.SP_A - schemaTotals.SP_P;
  const utilePeriodoCE = ricaviTotal - costiTotal;
  const discrepanzaQuadratura = utilePeriodoSP - utilePeriodoCE;
  // Tolleranza strettissima: solo arrotondamenti float (<0,05 €).
  // NON usare percentuali del totale — anche 1 € di discrepanza è un errore.
  const tollerazaQuadratura = 0.05;

  const filteredEntries = schemaFilter === "tutti"
    ? entries
    : schemaFilter === "CE_RICAVI"
      ? entries.filter((e) => e.schema_civilistico === "CE" && e.audit_area === "ricavi")
      : schemaFilter === "CE_COSTI"
        ? entries.filter((e) => e.schema_civilistico === "CE" && e.audit_area !== "ricavi")
        : entries.filter((e) => e.schema_civilistico === schemaFilter);

  const totalBalance = entries.reduce((s, e) => s + e.balance, 0);

  // ── Render ────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <form ref={formRef} onSubmit={handleAnalyze} className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo documento *</label>
          <select
            name="doc_type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {docType === "bilancio_verifica" && (
            <p className="mt-1 text-xs text-brand-600 font-medium">
              Mappatura AI attiva — le voci verranno classificate automaticamente secondo il codice civile.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">File *</label>
          <input
            ref={fileRef}
            name="file"
            type="file"
            required
            accept=".pdf,.xlsx,.xls,.ods,.csv,.txt"
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 cursor-pointer"
          />
          <p className="mt-1 text-xs text-gray-400">
            PDF, Excel (.xlsx, .xls), ODS, CSV, TXT — max 10 MB
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Periodo di riferimento *</label>
            <input
              name="period_label"
              type="text"
              required
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="es. 31/03/2026 oppure Q1 2026"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
            <input
              name="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opzionale"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/incarichi/${assignmentId}/trimestri/${quarterId}`)}
          >
            Annulla
          </Button>
          <Button type="submit" loading={analyzing}>
            {analyzing ? "Analisi in corso…" : "Analizza →"}
          </Button>
        </div>
      </form>
    );
  }

  // ── Step 2: validazione ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}

      {/* Header validazione */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Anteprima dati estratti</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {filename} · {entries.length} voci · totale saldo {fmt(totalBalance)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {aiUsed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 border border-brand-200">
                ✦ Mappatura AI attiva
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500" title={aiError ?? ""}>
                Classificazione locale{aiError ? " ⚠" : ""}
              </span>
            )}
            {aiError && (
              <span className="text-xs text-orange-600 font-mono bg-orange-50 px-2 py-0.5 rounded border border-orange-200 max-w-xs truncate" title={aiError}>
                AI: {aiError}
              </span>
            )}
          </div>
        </div>

        {/* Statistiche schema */}
        {(schemaCounts.SP_A > 0 || schemaCounts.SP_P > 0 || schemaCounts.CE > 0) && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-xs text-blue-600 font-medium">SP Attivo</p>
                <p className="text-lg font-bold text-blue-700 tabular-nums">{fmt(schemaTotals.SP_A)} €</p>
                <p className="text-xs text-blue-600">{schemaCounts.SP_A} voci</p>
              </div>
              <div className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2">
                <p className="text-xs text-purple-600 font-medium">SP Passivo + PN</p>
                <p className="text-lg font-bold text-purple-700 tabular-nums">{fmt(schemaTotals.SP_P)} €</p>
                <p className="text-xs text-purple-600">{schemaCounts.SP_P} voci</p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-600 font-medium">Conto Economico</p>
                <p className="text-lg font-bold text-amber-700 tabular-nums">{fmt(ricaviTotal)} R · {fmt(costiTotal)} C</p>
                <p className="text-xs text-amber-600">{schemaCounts.CE} voci</p>
              </div>
            </div>
            {(() => {
              const quadrato = Math.abs(discrepanzaQuadratura) < tollerazaQuadratura;
              return (
                <div className={`mt-2 rounded-md border px-3 py-2 text-sm ${quadrato ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                  <strong>Quadratura bilancio di verifica:</strong>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                    <div>Utile SP (Attivo − Passivo+PN): <span className="tabular-nums font-semibold">{fmt(utilePeriodoSP)} €</span></div>
                    <div>Utile CE (Ricavi − Costi): <span className="tabular-nums font-semibold">{fmt(utilePeriodoCE)} €</span></div>
                  </div>
                  <div className="mt-1 font-semibold">
                    {quadrato ? (
                      <span>✓ Bilancio quadrato — discrepanza: {fmt(discrepanzaQuadratura)} €</span>
                    ) : (
                      <span>
                        ✗ Discrepanza rilevata: {fmt(discrepanzaQuadratura)} € — verificare voci mancanti o classificate in modo errato.
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Tabella voci */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {/* Filtro schema */}
        <div className="flex flex-wrap gap-1 border-b border-gray-200 px-4 py-2 bg-gray-50">
          {(["tutti", "SP_A", "SP_P", "CE_RICAVI", "CE_COSTI"] as const).map((s) => {
            let count: number;
            if (s === "tutti") count = entries.length;
            else if (s === "CE_RICAVI") count = entries.filter((e) => e.schema_civilistico === "CE" && e.audit_area === "ricavi").length;
            else if (s === "CE_COSTI")  count = entries.filter((e) => e.schema_civilistico === "CE" && e.audit_area !== "ricavi").length;
            else count = schemaCounts[s as keyof typeof schemaCounts] ?? 0;
            const label = s === "tutti" ? `Tutti (${entries.length})` : `${SCHEMA_LABELS[s]?.label} (${count})`;
            const isActive = schemaFilter === s || (s === "CE_RICAVI" && schemaFilter === "CE_RICAVI") || (s === "CE_COSTI" && schemaFilter === "CE_COSTI");
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSchemaFilter(s)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-white border border-gray-300 text-gray-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left font-medium text-gray-500 w-20">Codice</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Descrizione</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">Saldo</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 w-48">Voce standard (AI)</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 w-24">Schema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((e, i) => {
                const badgeKey = schemaBadgeKey(e);
                const schemaBadge = badgeKey ? SCHEMA_LABELS[badgeKey] : null;
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-400">{e.account_code ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-xs truncate" title={e.account_name}>
                      {e.account_name}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${e.balance < 0 ? "text-red-600" : "text-gray-900"}`}>
                      {fmt(e.balance)}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={e.voce_standard ?? ""}>
                      {e.voce_standard ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {schemaBadge ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${schemaBadge.color}`}>
                          {schemaBadge.label}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Periodo (campo separato se non compilato) */}
      {!periodLabel.trim() && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <label className="block text-sm font-medium text-orange-800 mb-1">
            Periodo di riferimento obbligatorio
          </label>
          <input
            type="text"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="es. 31/03/2026 oppure Q1 2026"
            className="h-10 w-full rounded-md border border-orange-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      )}

      {/* Azioni */}
      <div className="flex justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => { setStep(1); setError(null); }}>
          ← Torna indietro
        </Button>
        <Button type="button" loading={saving} onClick={handleConfirm}>
          {saving ? "Salvataggio…" : `Conferma e salva ${entries.length} voci →`}
        </Button>
      </div>
    </div>
  );
}
