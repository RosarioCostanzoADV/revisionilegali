"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const AREAS = [
  { value: "cassa_banche", label: "Cassa e banche" },
  { value: "crediti_clienti", label: "Crediti verso clienti" },
  { value: "debiti_fornitori", label: "Debiti verso fornitori" },
  { value: "immobilizzazioni", label: "Immobilizzazioni" },
  { value: "rimanenze", label: "Rimanenze" },
  { value: "patrimonio_netto", label: "Patrimonio netto" },
  { value: "ricavi", label: "Ricavi" },
  { value: "costi", label: "Costi e oneri" },
  { value: "imposte", label: "Imposte e tasse" },
  { value: "adempimenti", label: "Adempimenti formali" },
  { value: "altro", label: "Altro" },
];

const AREA_LABELS: Record<string, string> = Object.fromEntries(
  AREAS.map((a) => [a.value, a.label]),
);

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  bozza: { label: "Bozza", className: "bg-gray-100 text-gray-500" },
  in_revisione: { label: "In revisione", className: "bg-yellow-100 text-yellow-700" },
  approvata: { label: "Approvata", className: "bg-emerald-100 text-emerald-700" },
};

interface WorkingPaper {
  id: string;
  title: string;
  area: string;
  status: string;
  prepared_by: string;
  created_at: string;
}

export function CarteSection({
  quarterId,
  assignmentId,
  initialPapers,
  preparerNames,
}: {
  quarterId: string;
  assignmentId: string;
  initialPapers: WorkingPaper[];
  preparerNames: Record<string, string>;
}) {
  const [papers, setPapers] = useState<WorkingPaper[]>(initialPapers);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tenant/working-papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quarter_id: quarterId,
        title: fd.get("title"),
        area: fd.get("area"),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }
    const { id } = await res.json();
    window.location.href = `/incarichi/${assignmentId}/trimestri/${quarterId}/carte/${id}`;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Carte di lavoro{papers.length > 0 && <span className="text-gray-400 font-normal"> ({papers.length})</span>}
        </h2>
        {!showForm && (
          <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
            + Nuova carta
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
              placeholder="es. Verifica saldi bancari al 31/03"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Area *</label>
            <select
              name="area"
              defaultValue="altro"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {AREAS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setError(null); }}>
              Annulla
            </Button>
            <Button type="submit" loading={saving}>Crea e apri</Button>
          </div>
        </form>
      )}

      {papers.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400">Nessuna carta di lavoro creata.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {papers.map((wp) => {
            const st = STATUS_STYLES[wp.status] ?? STATUS_STYLES.bozza;
            return (
              <li key={wp.id} className="py-3">
                <Link
                  href={`/incarichi/${assignmentId}/trimestri/${quarterId}/carte/${wp.id}`}
                  className="flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                      {wp.title}
                    </p>
                    <div className="flex gap-x-3 mt-0.5">
                      <span className="text-xs text-gray-400">{AREA_LABELS[wp.area] ?? wp.area}</span>
                      <span className="text-xs text-gray-400">{preparerNames[wp.prepared_by] ?? "—"}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(wp.created_at).toLocaleDateString("it-IT")}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>
                    {st.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
