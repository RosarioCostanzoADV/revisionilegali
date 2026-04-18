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
  currentUserId,
  canEdit,
}: {
  quarterId: string;
  assignmentId: string;
  initialPapers: WorkingPaper[];
  preparerNames: Record<string, string>;
  currentUserId: string;
  canEdit: boolean;
}) {
  const [papers, setPapers] = useState<WorkingPaper[]>(initialPapers);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(wp: WorkingPaper) {
    if (!confirm(`Eliminare la carta "${wp.title}"? L'operazione non è reversibile.`)) return;
    setDeletingId(wp.id);
    const res = await fetch(`/api/tenant/working-papers/${wp.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : "Errore durante l'eliminazione.");
      return;
    }
    setPapers((prev) => prev.filter((p) => p.id !== wp.id));
  }

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
            const st = STATUS_STYLES[wp.status] ?? STATUS_STYLES.bozza!;
            const canDelete =
              wp.status !== "approvata" &&
              (wp.prepared_by === currentUserId || canEdit);
            return (
              <li key={wp.id} className="py-3 flex items-center gap-2">
                <Link
                  href={`/incarichi/${assignmentId}/trimestri/${quarterId}/carte/${wp.id}`}
                  className="flex flex-1 items-center justify-between gap-3 group min-w-0"
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
                {canDelete && (
                  <button
                    type="button"
                    disabled={deletingId === wp.id}
                    onClick={() => handleDelete(wp)}
                    className="shrink-0 p-1 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                    title="Elimina carta"
                  >
                    {deletingId === wp.id ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
