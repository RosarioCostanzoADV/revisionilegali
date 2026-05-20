"use client";

import { useState, useCallback } from "react";
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

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  bozza: { label: "Bozza", className: "bg-gray-100 text-gray-600" },
  in_revisione: { label: "In revisione", className: "bg-yellow-100 text-yellow-700" },
  approvata: { label: "Approvata", className: "bg-emerald-100 text-emerald-700" },
};

export function WorkingPaperEditor({
  paperId,
  initialTitle,
  initialArea,
  initialContent,
  initialStatus,
  canEdit,
  isOwnerOrRevisor,
  isPreparer,
}: {
  paperId: string;
  initialTitle: string;
  initialArea: string;
  initialContent: string;
  initialStatus: string;
  canEdit: boolean;
  isOwnerOrRevisor: boolean;
  isPreparer: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [area, setArea] = useState(initialArea);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reopenMode, setReopenMode] = useState(false);
  const [reopenNote, setReopenNote] = useState("");

  const st = STATUS_STYLES[status] ?? STATUS_STYLES.bozza!;
  const isLocked = status === "approvata";
  const isInReview = status === "in_revisione";

  const patch = useCallback(async (payload: Record<string, unknown>) => {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch(`/api/tenant/working-papers/${paperId}`, {
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
  }, [paperId]);

  async function handleSave() {
    const ok = await patch({ title, area, content });
    if (ok) setSaved(true);
  }

  async function handleSubmitForReview() {
    const ok = await patch({ title, area, content, status: "in_revisione" });
    if (ok) { setStatus("in_revisione"); setSaved(true); }
  }

  async function handleApprove() {
    const ok = await patch({ status: "approvata" });
    if (ok) { setStatus("approvata"); setSaved(true); }
  }

  async function handleSendBack() {
    const ok = await patch({ status: "bozza" });
    if (ok) { setStatus("bozza"); setSaved(true); }
  }

  async function handleReopen() {
    if (!reopenNote.trim()) { setError("Inserisci il motivo della riapertura."); return; }
    const ok = await patch({ status: "in_revisione", reopen_note: reopenNote });
    if (ok) { setStatus("in_revisione"); setReopenMode(false); setReopenNote(""); setSaved(true); }
  }

  const isDirty =
    title !== initialTitle ||
    area !== initialArea ||
    content !== initialContent;

  return (
    <div className="space-y-4">
      {/* Intestazione con stato */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${st.className}`}>
          {st.label}
        </span>

        <div className="flex items-center gap-2">
          {/* Salva bozza */}
          {canEdit && !isLocked && !isInReview && (
            <Button
              type="button"
              variant="secondary"
              loading={saving}
              disabled={!isDirty || saving}
              onClick={handleSave}
            >
              Salva bozza
            </Button>
          )}

          {/* Salva quando in revisione (solo owner/revisor) */}
          {canEdit && isInReview && isOwnerOrRevisor && (
            <Button
              type="button"
              variant="secondary"
              loading={saving}
              disabled={!isDirty || saving}
              onClick={handleSave}
            >
              Salva modifiche
            </Button>
          )}

          {/* Invia in revisione (preparer, in bozza) */}
          {(isPreparer || isOwnerOrRevisor) && status === "bozza" && (
            <Button type="button" loading={saving} onClick={handleSubmitForReview}>
              Invia in revisione
            </Button>
          )}

          {/* Rimanda in bozza (owner/revisor, in revisione) */}
          {isOwnerOrRevisor && isInReview && (
            <Button type="button" variant="secondary" loading={saving} onClick={handleSendBack}>
              Rimanda in bozza
            </Button>
          )}

          {/* Approva (owner/revisor, in revisione) */}
          {isOwnerOrRevisor && isInReview && (
            <Button type="button" loading={saving} onClick={handleApprove}>
              Approva
            </Button>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {saved && !error && <Alert tone="success">Salvato.</Alert>}

      {/* Contenuto carta */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        {/* Titolo */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Titolo</label>
          {canEdit && !isLocked && !(isInReview && !isOwnerOrRevisor) ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-900">{title}</p>
          )}
        </div>

        {/* Area */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Area</label>
          {canEdit && !isLocked && !(isInReview && !isOwnerOrRevisor) ? (
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {AREAS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-700">
              {AREAS.find((a) => a.value === area)?.label ?? area}
            </p>
          )}
        </div>

        {/* Contenuto */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Contenuto
            <span className="ml-1 text-xs text-gray-400 font-normal">
              — procedure svolte, evidenze, conclusione
            </span>
          </label>
          {canEdit && !isLocked && !(isInReview && !isOwnerOrRevisor) ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder={`Descrivi le procedure di revisione svolte per quest'area.\n\nEsempio:\n1. Procedura svolta: ...\n2. Evidenze ottenute: ...\n3. Conclusione: ...`}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 min-h-40">
              <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {content || <span className="text-gray-400 italic">Nessun contenuto.</span>}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Carta approvata — banner + riapertura */}
      {isLocked && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-emerald-800">
              Carta approvata — solo il revisore o titolare può riaprirla per modifiche.
            </p>
            {isOwnerOrRevisor && !reopenMode && (
              <button
                type="button"
                onClick={() => { setReopenMode(true); setError(null); }}
                className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900"
              >
                Riapri per modifica
              </button>
            )}
          </div>
          {reopenMode && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-emerald-900">
                Motivo della riapertura <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reopenNote}
                onChange={(e) => setReopenNote(e.target.value)}
                rows={2}
                placeholder="Es: Correzione importo voce X, aggiornamento documentazione..."
                className="w-full rounded-md border border-emerald-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                <Button type="button" loading={saving} onClick={handleReopen}>
                  Conferma riapertura
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setReopenMode(false); setReopenNote(""); setError(null); }}>
                  Annulla
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
