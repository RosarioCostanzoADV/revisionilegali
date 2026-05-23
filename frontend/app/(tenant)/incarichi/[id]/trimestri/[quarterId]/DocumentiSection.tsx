"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const CATEGORIES = [
  { value: "bilancio", label: "Bilancio" },
  { value: "estratto_conto", label: "Estratto conto" },
  { value: "contratto", label: "Contratto" },
  { value: "fattura", label: "Fattura / Nota spese" },
  { value: "verbale", label: "Verbale" },
  { value: "relazione", label: "Relazione" },
  { value: "altro", label: "Altro" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

interface Document {
  id: string;
  name: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  notes: string | null;
  created_at: string;
  uploaded_by: string;
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

export function DocumentiSection({
  quarterId,
  initialDocuments,
  uploaderNames,
  canUpload,
  currentUserId,
  isOwnerOrRevisor,
}: {
  quarterId: string;
  initialDocuments: Document[];
  uploaderNames: Record<string, string>;
  canUpload: boolean;
  currentUserId: string;
  isOwnerOrRevisor: boolean;
}) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) {
      setUploadError("Seleziona un file.");
      return;
    }
    fd.set("quarter_id", quarterId);
    setUploading(true);
    const res = await fetch("/api/documents", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setUploadError(typeof data.error === "string" ? data.error : "Errore durante il caricamento.");
      return;
    }
    setShowForm(false);
    if (fileRef.current) fileRef.current.value = "";
    // Ricarica lista
    const listRes = await fetch(`/api/documents?quarter_id=${quarterId}`);
    if (listRes.ok) setDocuments(await listRes.json());
  }

  async function handleDownload(doc: Document) {
    setDownloadingId(doc.id);
    const res = await fetch(`/api/documents/${doc.id}`);
    setDownloadingId(null);
    if (!res.ok) return;
    const { url } = await res.json();
    window.open(url, "_blank");
  }

  async function handleDelete(docId: string) {
    if (!confirm("Eliminare questo documento?")) return;
    setDeletingId(docId);
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Documenti {documents.length > 0 && <span className="text-gray-400 font-normal">({documents.length})</span>}
        </h2>
        {canUpload && !showForm && (
          <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
            + Carica documento
          </Button>
        )}
      </div>

      {/* Form upload */}
      {showForm && (
        <form onSubmit={handleUpload} className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          {uploadError && <Alert tone="error">{uploadError}</Alert>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">File *</label>
            <input
              ref={fileRef}
              name="file"
              type="file"
              required
              accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.csv"
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-400">PDF, Excel, Word, immagini, CSV — max 20 MB</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Categoria *</label>
              <select
                name="category"
                defaultValue="altro"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome personalizzato</label>
              <input
                name="name"
                type="text"
                placeholder="Lascia vuoto per usare il nome file"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
            <input
              name="notes"
              type="text"
              placeholder="Descrizione opzionale"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setUploadError(null); }}>
              Annulla
            </Button>
            <Button type="submit" loading={uploading}>Carica</Button>
          </div>
        </form>
      )}

      {/* Lista documenti */}
      {documents.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400">Nessun documento caricato.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documents.map((doc) => {
            const canDelete = isOwnerOrRevisor || doc.uploaded_by === currentUserId;
            return (
              <li key={doc.id} className="flex items-start gap-3 py-3">
                <span className="text-xl leading-none mt-0.5">{fileIcon(doc.mime_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {CATEGORY_LABELS[doc.category] ?? doc.category}
                    </span>
                    <span className="text-xs text-gray-400">{formatSize(doc.file_size)}</span>
                    <span className="text-xs text-gray-400">
                      {uploaderNames[doc.uploaded_by] ?? "—"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                  {doc.notes && (
                    <p className="mt-0.5 text-xs text-gray-500 italic">{doc.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    {downloadingId === doc.id ? "..." : "Scarica"}
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === doc.id ? "..." : "Elimina"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
