"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const TYPE_LABELS: Record<string, string> = {
  relazione_revisione: "Relazione di revisione",
  lettera_direzione: "Lettera di direzione",
  verbale_collegio: "Verbale del collegio sindacale",
  verbale_sindaco: "Verbale del sindaco unico",
  altro: "Altro documento",
};

export function DraftEditor({
  draftId,
  assignmentId,
  initialTitle,
  initialContent,
  initialStatus,
  type,
}: {
  draftId: string;
  assignmentId: string;
  initialTitle: string;
  initialContent: string;
  initialStatus: string;
  type: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDefinitivo, setConfirmDefinitivo] = useState(false);

  const isDefinitivo = status === "definitivo";

  const patch = useCallback(async (payload: Record<string, unknown>) => {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch(`/api/tenant/drafts/${draftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return false;
    }
    return true;
  }, [draftId]);

  async function handleSave() {
    const ok = await patch({ title, content });
    if (ok) setSaved(true);
  }

  async function handleMarkDefinitivo() {
    const ok = await patch({ title, content, status: "definitivo" });
    if (ok) { setStatus("definitivo"); setSaved(true); setConfirmDefinitivo(false); }
  }

  const isDirty = title !== initialTitle || content !== initialContent;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${isDefinitivo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
            {isDefinitivo ? "Definitivo" : "Bozza"}
          </span>
          <span className="text-xs text-gray-400">{TYPE_LABELS[type] ?? type}</span>
        </div>

        <div className="flex items-center gap-2">
          {!isDefinitivo && (
            <>
              <Button
                type="button"
                variant="secondary"
                loading={saving}
                disabled={!isDirty || saving}
                onClick={handleSave}
              >
                Salva bozza
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.open(`/incarichi/${assignmentId}/bozze/${draftId}/stampa`, "_blank")}
              >
                Anteprima / Stampa
              </Button>
              {!confirmDefinitivo ? (
                <Button type="button" onClick={() => setConfirmDefinitivo(true)}>
                  Segna come definitivo
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-600">Confermi? Non sarà più modificabile.</span>
                  <Button type="button" loading={saving} onClick={handleMarkDefinitivo}>Sì, conferma</Button>
                  <Button type="button" variant="secondary" onClick={() => setConfirmDefinitivo(false)}>No</Button>
                </div>
              )}
            </>
          )}
          {isDefinitivo && (
            <Button
              type="button"
              onClick={() => window.open(`/incarichi/${assignmentId}/bozze/${draftId}/stampa`, "_blank")}
            >
              Stampa / Esporta PDF
            </Button>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {saved && !error && <Alert tone="success">Salvato.</Alert>}

      {/* Titolo */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Titolo documento</label>
        {!isDefinitivo ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        ) : (
          <p className="text-base font-semibold text-gray-900">{title}</p>
        )}
      </div>

      {/* Editor */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Contenuto
          {!isDefinitivo && (
            <span className="ml-1 text-xs text-gray-400 font-normal">— modifica il testo del documento</span>
          )}
        </label>
        {!isDefinitivo ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={32}
            className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        ) : (
          <div className="rounded-md border border-gray-200 bg-white px-6 py-5 min-h-96">
            <pre className="text-sm font-mono leading-relaxed text-gray-800 whitespace-pre-wrap">{content}</pre>
          </div>
        )}
      </div>

      {isDefinitivo && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Documento definitivo — usa "Stampa / Esporta PDF" per produrre il PDF finale.
        </div>
      )}
    </div>
  );
}
