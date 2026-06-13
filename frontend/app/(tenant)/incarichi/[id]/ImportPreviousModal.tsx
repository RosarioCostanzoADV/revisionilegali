"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface DocItem {
  id: string;
  name: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  created_at: string;
}

interface ImportPreviousModalProps {
  previousAssignmentId: string;
  categorySlug: string;
  targetAssignmentId: string;
  onClose: () => void;
  onImported: (newDocs: DocItem[]) => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null): string {
  if (!mime) return "📄";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv") return "📗";
  if (mime.includes("word")) return "📘";
  if (mime.startsWith("image/")) return "🖼️";
  return "📄";
}

export function ImportPreviousModal({
  previousAssignmentId,
  categorySlug,
  targetAssignmentId,
  onClose,
  onImported,
}: ImportPreviousModalProps) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/documents?assignment_id=${previousAssignmentId}`)
      .then((r) => r.json())
      .then((data: DocItem[]) => {
        const filtered = Array.isArray(data)
          ? data.filter((d) => d.category === categorySlug)
          : [];
        setDocs(filtered);
        setSelected(new Set(filtered.map((d) => d.id)));
      })
      .catch(() => setError("Errore nel caricamento dei documenti precedenti."))
      .finally(() => setLoading(false));
  }, [previousAssignmentId, categorySlug]);

  function toggleAll() {
    if (selected.size === docs.length) setSelected(new Set());
    else setSelected(new Set(docs.map((d) => d.id)));
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleImport() {
    if (!selected.size) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_ids: [...selected],
          target_assignment_id: targetAssignmentId,
        }),
      });
      if (!res.ok) throw new Error("Errore durante la copia dei documenti.");

      const copiedDocs = docs
        .filter((d) => selected.has(d.id))
        .map((d) => ({ ...d }));

      onImported(copiedDocs);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Importa da anno precedente</h3>
            <p className="text-xs text-gray-500 mt-0.5">Seleziona i documenti da copiare nell'incarico corrente.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Caricamento in corso...</div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-red-500">{error}</div>
          ) : docs.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Nessun documento trovato in questa categoria nell'anno precedente.
            </div>
          ) : (
            <div className="space-y-1">
              <label className="flex items-center gap-2 pb-2 border-b mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === docs.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600"
                />
                <span className="text-xs font-medium text-gray-600">Seleziona tutti ({docs.length})</span>
              </label>
              {docs.map((doc) => (
                <label key={doc.id} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(doc.id)}
                    onChange={() => toggle(doc.id)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600"
                  />
                  <span className="text-base leading-none">{fileIcon(doc.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatSize(doc.file_size)}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
          <span className="text-xs text-gray-500">
            {selected.size} di {docs.length} selezionati
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Annulla
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!selected.size || importing || loading}
              loading={importing}
            >
              Importa selezionati
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
