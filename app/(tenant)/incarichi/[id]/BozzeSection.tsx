"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const TYPES = [
  { value: "relazione_revisione", label: "Relazione di revisione" },
  { value: "lettera_direzione", label: "Lettera di direzione" },
  { value: "verbale_collegio", label: "Verbale del collegio sindacale" },
  { value: "verbale_sindaco", label: "Verbale del sindaco unico" },
  { value: "altro", label: "Altro documento" },
];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  bozza: { label: "Bozza", className: "bg-gray-100 text-gray-500" },
  definitivo: { label: "Definitivo", className: "bg-emerald-100 text-emerald-700" },
};

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label]),
);

interface Draft {
  id: string;
  title: string;
  type: string;
  status: string;
  updated_at: string;
}

export function BozzeSection({
  assignmentId,
  initialDrafts,
  canCreate,
}: {
  assignmentId: string;
  initialDrafts: Draft[];
  canCreate: boolean;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tenant/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignment_id: assignmentId,
        title: fd.get("title"),
        type: fd.get("type"),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante la creazione.");
      return;
    }
    const { id } = await res.json();
    window.location.href = `/incarichi/${assignmentId}/bozze/${id}`;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Bozze e verbali
          {drafts.length > 0 && <span className="text-gray-400 font-normal"> ({drafts.length})</span>}
        </h2>
        {canCreate && !showForm && (
          <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
            + Nuovo documento
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo documento *</label>
            <select
              name="type"
              defaultValue="relazione_revisione"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Titolo *</label>
            <input
              name="title"
              type="text"
              required
              autoFocus
              placeholder="es. Relazione di revisione al 31/12/2026"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setError(null); }}>
              Annulla
            </Button>
            <Button type="submit" loading={saving}>Crea e apri editor</Button>
          </div>
        </form>
      )}

      {drafts.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400">Nessun documento creato.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {drafts.map((d) => {
            const st = STATUS_STYLES[d.status] ?? STATUS_STYLES.bozza;
            return (
              <li key={d.id} className="py-3">
                <Link
                  href={`/incarichi/${assignmentId}/bozze/${d.id}`}
                  className="flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                      {d.title}
                    </p>
                    <div className="flex gap-x-3 mt-0.5">
                      <span className="text-xs text-gray-400">{TYPE_LABELS[d.type] ?? d.type}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(d.updated_at).toLocaleDateString("it-IT")}
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
