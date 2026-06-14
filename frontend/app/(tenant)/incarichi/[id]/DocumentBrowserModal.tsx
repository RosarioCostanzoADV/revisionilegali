"use client";

import { useRef, useState } from "react";

import type { CategoryDef } from "@/lib/assignment-categories";
import { FilePreviewModal, type PreviewDoc } from "./FilePreviewModal";
import { ImportPreviousModal } from "./ImportPreviousModal";

export interface DocItem {
  id: string;
  name: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  created_at: string;
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
  if (mime.includes("word") || mime.includes("document")) return "📘";
  if (mime.startsWith("image/")) return "🖼️";
  return "📄";
}

interface DocumentBrowserModalProps {
  category: CategoryDef;
  assignmentId: string;
  quarterId?: string;
  docs: DocItem[];
  isNA: boolean;
  canEdit: boolean;
  previousAssignmentId: string | null;
  onClose: () => void;
  onDocsChange: (categorySlug: string, newDocs: DocItem[]) => void;
  onNAChange: (categorySlug: string, isNA: boolean) => void;
}

export function DocumentBrowserModal({
  category,
  assignmentId,
  quarterId,
  docs,
  isNA,
  canEdit,
  previousAssignmentId,
  onClose,
  onDocsChange,
  onNAChange,
}: DocumentBrowserModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingSaving, setRenamingSaving] = useState(false);
  const [togglingNA, setTogglingNA] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const [showImport, setShowImport] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    const newDocs: DocItem[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      if (quarterId) {
        fd.append("quarter_id", quarterId);
      } else {
        fd.append("assignment_id", assignmentId);
      }
      fd.append("category", category.slug);
      try {
        const res = await fetch("/api/documents", { method: "POST", body: fd });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? "Errore durante il caricamento.");
        }
        const { id } = await res.json() as { id: string };
        newDocs.push({
          id,
          name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          category: category.slug,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Errore sconosciuto.");
        break;
      }
    }

    if (newDocs.length) onDocsChange(category.slug, [...docs, ...newDocs]);
    setUploading(false);
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione.");
      onDocsChange(category.slug, docs.filter((d) => d.id !== docId));
    } catch {
      // silent — doc stays
    } finally {
      setDeletingId(null);
    }
  }

  function startRename(doc: DocItem) {
    setRenamingId(doc.id);
    setRenameValue(doc.name);
  }

  async function confirmRename(docId: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) { cancelRename(); return; }
    setRenamingSaving(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      onDocsChange(category.slug, docs.map((d) => d.id === docId ? { ...d, name: trimmed } : d));
    } catch {
      // silent
    } finally {
      setRenamingSaving(false);
      setRenamingId(null);
    }
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function handleToggleNA() {
    setTogglingNA(true);
    const next = !isNA;
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/category-flags/${category.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_na: next }),
      });
      if (!res.ok) throw new Error();
      onNAChange(category.slug, next);
    } catch {
      // silent
    } finally {
      setTogglingNA(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex-1 pr-4">
              <h2 className="text-base font-semibold text-gray-900">{category.label}</h2>
              <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{category.description}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Chiudi"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Upload zone */}
            {canEdit && (
              <div
                className={`rounded-xl border-2 border-dashed transition-colors ${
                  isDragging ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  uploadFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2 py-5 px-4 text-center cursor-pointer">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isDragging ? "bg-brand-100" : "bg-gray-100"}`}>
                    <svg className={`h-5 w-5 ${isDragging ? "text-brand-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {uploading ? "Caricamento in corso..." : "Trascina qui i file o clicca per selezionarli"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF, Word, Excel, immagini · Max 50 MB per file</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Import from previous */}
            {canEdit && category.isCompanyLinked && previousAssignmentId && (
              <button
                onClick={() => setShowImport(true)}
                className="w-full flex items-center gap-2.5 rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-brand-300 hover:bg-brand-50/50 transition-colors group"
              >
                <svg className="h-4 w-4 text-gray-400 group-hover:text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="text-sm text-gray-600 group-hover:text-brand-700">Importa documenti dall&apos;anno precedente</span>
              </button>
            )}

            {uploadError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
            )}

            {/* Document list */}
            {docs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Nessun documento caricato</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 mb-2">{docs.length} documento{docs.length !== 1 ? "i" : ""}</p>
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg leading-none shrink-0">{fileIcon(doc.mime_type)}</span>

                    <div className="flex-1 min-w-0">
                      {renamingId === doc.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmRename(doc.id);
                              if (e.key === "Escape") cancelRename();
                            }}
                            className="flex-1 min-w-0 rounded border border-brand-300 px-2 py-0.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                          <button
                            onClick={() => confirmRename(doc.id)}
                            disabled={renamingSaving}
                            className="text-xs text-brand-600 hover:text-brand-800 font-medium shrink-0"
                          >
                            {renamingSaving ? "..." : "Salva"}
                          </button>
                          <button onClick={cancelRename} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-400">{formatSize(doc.file_size)}</p>
                        </>
                      )}
                    </div>

                    {renamingId !== doc.id && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          title="Anteprima"
                          onClick={() => setPreviewDoc({ id: doc.id, name: doc.name, mime_type: doc.mime_type })}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {canEdit && (
                          <>
                            <button
                              title="Rinomina"
                              onClick={() => startRename(doc)}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <button
                              title="Elimina"
                              onClick={() => handleDelete(doc.id)}
                              disabled={deletingId === doc.id}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              {deletingId === doc.id ? (
                                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              )}
                            </button>
                          </>
                        )}
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          download
                          title="Scarica"
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* N/A toggle */}
            {category.canBeNA && canEdit && (
              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Segna come Non Applicabile</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Indica che questa categoria non è pertinente per questo incarico.
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={isNA}
                    onClick={handleToggleNA}
                    disabled={togglingNA}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                      isNA ? "bg-gray-400" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                        isNA ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewDoc && (
        <FilePreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {showImport && previousAssignmentId && (
        <ImportPreviousModal
          previousAssignmentId={previousAssignmentId}
          categorySlug={category.slug}
          targetAssignmentId={assignmentId}
          onClose={() => setShowImport(false)}
          onImported={(newDocs) => {
            onDocsChange(category.slug, [...docs, ...newDocs]);
            setShowImport(false);
          }}
        />
      )}
    </>
  );
}
