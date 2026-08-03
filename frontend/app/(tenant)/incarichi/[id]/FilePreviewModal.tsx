"use client";

import { useEffect, useState } from "react";

export interface PreviewDoc {
  id: string;
  name: string;
  mime_type: string | null;
}

function canPreviewInBrowser(mime: string | null): boolean {
  if (!mime) return false;
  return (
    mime === "application/pdf" ||
    mime.startsWith("image/") ||
    mime === "text/plain" ||
    mime === "text/csv"
  );
}

interface FilePreviewModalProps {
  doc: PreviewDoc;
  onClose: () => void;
}

export function FilePreviewModal({ doc, onClose }: FilePreviewModalProps) {
  const downloadUrl = `/api/documents/${doc.id}/download`;
  const canPreview = canPreviewInBrowser(doc.mime_type);

  // Carica il file come blob per evitare che il browser lo scarichi
  // invece di mostrarlo inline (problema noto con iframe + PDF proxy)
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!canPreview) return;
    let url: string | null = null;
    fetch(`/api/documents/${doc.id}/preview`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.blob();
      })
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch(() => setLoadError(true));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.id, canPreview]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/80" onClick={onClose}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-white truncate max-w-[70%]">{doc.name}</span>
        <div className="flex items-center gap-3">
          <a
            href={downloadUrl}
            download
            className="text-xs text-gray-300 hover:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Scarica
          </a>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Chiudi"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {canPreview ? (
          loadError ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">Impossibile caricare il file.</p>
            </div>
          ) : !blobUrl ? (
            <div className="flex h-full items-center justify-center gap-3">
              <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-gray-400">Caricamento...</span>
            </div>
          ) : doc.mime_type?.startsWith("image/") ? (
            <div className="flex h-full items-center justify-center p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blobUrl}
                alt={doc.name}
                className="max-h-full max-w-full object-contain rounded shadow-xl"
              />
            </div>
          ) : (
            <iframe
              src={blobUrl}
              className="h-full w-full border-0"
              title={doc.name}
            />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-300 font-medium">Anteprima non disponibile</p>
              <p className="mt-1 text-xs text-gray-500">
                Questo formato non supporta l&apos;anteprima nel browser.
              </p>
            </div>
            <a
              href={downloadUrl}
              download
              className="mt-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Scarica il file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
