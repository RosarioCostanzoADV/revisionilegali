"use client";

import { useState } from "react";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  verbale_collegio: "Verbale Collegio Sindacale",
  verbale_sindaco:  "Verbale Sindaco Unico",
  altro:            "Documento",
};

const STATUS_STYLES: Record<string, string> = {
  bozza:       "bg-gray-100 text-gray-600",
  in_revisione:"bg-yellow-100 text-yellow-700",
  approvata:   "bg-emerald-100 text-emerald-700",
  finale:      "bg-blue-100 text-blue-700",
};

interface Draft {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
}

export function VerbaliSection({
  quarterId,
  assignmentId,
  quarterLabel,
  initialDrafts,
  canCreate,
}: {
  quarterId: string;
  assignmentId: string;
  quarterLabel: string;
  initialDrafts: Draft[];
  canCreate: boolean;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<string>("verbale_collegio");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setCreating(true);
    const title = `${TYPE_LABELS[type] ?? "Verbale"} — ${quarterLabel}`;
    const res = await fetch("/api/tenant/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId, quarter_id: quarterId, title, type }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Errore nella creazione.");
      return;
    }
    // Ricarica lista verbali del trimestre
    const listRes = await fetch(`/api/tenant/drafts?quarter_id=${quarterId}`);
    if (listRes.ok) {
      const list = await listRes.json();
      setDrafts(list);
    }
    setShowForm(false);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Verbali trimestrali
          {drafts.length > 0 && <span className="text-gray-400 font-normal"> ({drafts.length})</span>}
        </h2>
        {canCreate && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            + Nuovo verbale
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo verbale</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="verbale_collegio">Verbale Collegio Sindacale</option>
              <option value="verbale_sindaco">Verbale Sindaco Unico</option>
              <option value="altro">Documento generico</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {creating ? "Creazione..." : "Crea verbale"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {drafts.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400">
          Nessun verbale trimestrale. Crea un verbale del collegio sindacale o del sindaco unico per questo trimestre.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {drafts.map((d) => (
            <li key={d.id} className="py-3">
              <Link
                href={`/incarichi/${assignmentId}/bozze/${d.id}`}
                className="group flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                    {d.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {TYPE_LABELS[d.type] ?? d.type} · {new Date(d.created_at).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status] ?? STATUS_STYLES.bozza}`}>
                  {d.status === "bozza" ? "Bozza" : d.status === "in_revisione" ? "In revisione" : d.status === "approvata" ? "Approvato" : d.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
