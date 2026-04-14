"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface AccountingImport {
  id: string;
  filename: string;
  period_label: string;
  row_count: number | null;
  created_at: string;
}

export function ImportSection({
  quarterId,
  assignmentId,
  initialImports,
  uploaderNames,
  canUpload,
}: {
  quarterId: string;
  assignmentId: string;
  initialImports: AccountingImport[];
  uploaderNames: Record<string, string>;
  canUpload: boolean;
}) {
  const [imports, setImports] = useState<AccountingImport[]>(initialImports);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) { setError("Seleziona un file CSV."); return; }
    fd.set("quarter_id", quarterId);
    setUploading(true);
    const res = await fetch("/api/tenant/accounting-imports", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante l'importazione.");
      return;
    }
    const { id } = await res.json();
    window.location.href = `/incarichi/${assignmentId}/trimestri/${quarterId}/import/${id}`;
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo import e tutti i dati contabili associati?")) return;
    setDeletingId(id);
    await fetch(`/api/tenant/accounting-imports/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setImports((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Import contabile
          {imports.length > 0 && <span className="text-gray-400 font-normal"> ({imports.length})</span>}
        </h2>
        {canUpload && !showForm && (
          <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
            + Importa CSV
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">File CSV *</label>
            <input
              ref={fileRef}
              name="file"
              type="file"
              required
              accept=".csv,.txt,.xlsx,.xls,.ods"
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-400">
              Formati supportati: <strong>Excel (.xlsx, .xls)</strong>, ODS, CSV, TXT — colonne: Codice, Descrizione, Saldo (opzionale: Saldo Precedente) — max 10 MB
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Periodo di riferimento *</label>
              <input
                name="period_label"
                type="text"
                required
                placeholder="es. 31/03/2026 oppure Q1 2026"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
              <input
                name="notes"
                type="text"
                placeholder="Opzionale"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setError(null); }}>Annulla</Button>
            <Button type="submit" loading={uploading}>Importa e analizza</Button>
          </div>
        </form>
      )}

      {imports.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400">Nessun import contabile. Carica un file CSV dal tuo software di contabilità.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {imports.map((imp) => (
            <li key={imp.id} className="flex items-center justify-between gap-3 py-3">
              <Link
                href={`/incarichi/${assignmentId}/trimestri/${quarterId}/import/${imp.id}`}
                className="flex-1 min-w-0 group"
              >
                <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                  {imp.period_label}
                </p>
                <div className="flex gap-x-3 mt-0.5">
                  <span className="text-xs text-gray-400">{imp.filename}</span>
                  {imp.row_count && <span className="text-xs text-gray-400">{imp.row_count} conti</span>}
                  <span className="text-xs text-gray-400">
                    {new Date(imp.created_at).toLocaleDateString("it-IT")}
                  </span>
                </div>
              </Link>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => handleDelete(imp.id)}
                  disabled={deletingId === imp.id}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0"
                >
                  {deletingId === imp.id ? "..." : "Elimina"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
