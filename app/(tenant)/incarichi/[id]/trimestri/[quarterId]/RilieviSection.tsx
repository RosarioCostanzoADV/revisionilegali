"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const SEVERITIES = [
  { value: "bassa", label: "Bassa", className: "bg-emerald-100 text-emerald-700" },
  { value: "media", label: "Media", className: "bg-yellow-100 text-yellow-700" },
  { value: "alta", label: "Alta", className: "bg-orange-100 text-orange-700" },
  { value: "critica", label: "Critica", className: "bg-red-100 text-red-700" },
];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  aperto: { label: "Aperto", className: "bg-blue-100 text-blue-700" },
  in_gestione: { label: "In gestione", className: "bg-yellow-100 text-yellow-700" },
  risolto: { label: "Risolto", className: "bg-emerald-100 text-emerald-700" },
  chiuso: { label: "Chiuso", className: "bg-gray-100 text-gray-500" },
};

const SEVERITY_MAP: Record<string, typeof SEVERITIES[0]> = Object.fromEntries(
  SEVERITIES.map((s) => [s.value, s]),
);

interface Finding {
  id: string;
  title: string;
  severity: string;
  status: string;
  raised_by: string;
  due_date: string | null;
  created_at: string;
}

export function RilieviSection({
  quarterId,
  assignmentId,
  initialFindings,
  raisedByNames,
}: {
  quarterId: string;
  assignmentId: string;
  initialFindings: Finding[];
  raisedByNames: Record<string, string>;
}) {
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tenant/findings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quarter_id: quarterId,
        title: fd.get("title"),
        severity: fd.get("severity"),
        description: fd.get("description") || null,
        recommendation: fd.get("recommendation") || null,
        due_date: fd.get("due_date") || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }
    const { id } = await res.json();
    window.location.href = `/incarichi/${assignmentId}/trimestri/${quarterId}/rilievi/${id}`;
  }

  const openCount = findings.filter((f) => f.status !== "chiuso").length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Rilievi</h2>
          {findings.length > 0 && (
            <span className="text-xs text-gray-400">
              ({openCount} aperti / {findings.length} totali)
            </span>
          )}
        </div>
        {!showForm && (
          <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
            + Nuovo rilievo
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          {error && <Alert tone="error">{error}</Alert>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Titolo *</label>
            <input
              name="title"
              type="text"
              required
              autoFocus
              placeholder="es. Saldo conto corrente non riconciliato"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Severità *</label>
              <select
                name="severity"
                defaultValue="media"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Scadenza</label>
              <input
                name="due_date"
                type="date"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descrizione</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Descrizione del problema riscontrato..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Raccomandazione</label>
            <textarea
              name="recommendation"
              rows={2}
              placeholder="Azione correttiva raccomandata..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setError(null); }}>
              Annulla
            </Button>
            <Button type="submit" loading={saving}>Crea e apri</Button>
          </div>
        </form>
      )}

      {findings.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400">Nessun rilievo registrato.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {findings.map((f) => {
            const sev = SEVERITY_MAP[f.severity];
            const st = STATUS_STYLES[f.status] ?? STATUS_STYLES.aperto;
            const isOverdue = f.due_date && f.status !== "chiuso" && new Date(f.due_date) < new Date();
            return (
              <li key={f.id} className="py-3">
                <Link
                  href={`/incarichi/${assignmentId}/trimestri/${quarterId}/rilievi/${f.id}`}
                  className="flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                      {f.title}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-gray-400">{raisedByNames[f.raised_by] ?? "—"}</span>
                      {f.due_date && (
                        <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                          Scad. {new Date(f.due_date).toLocaleDateString("it-IT")}
                          {isOverdue ? " ⚠" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sev?.className ?? ""}`}>
                      {sev?.label ?? f.severity}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>
                      {st.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
