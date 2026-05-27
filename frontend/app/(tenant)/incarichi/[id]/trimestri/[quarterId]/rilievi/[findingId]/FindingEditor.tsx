"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const SEVERITIES = [
  { value: "bassa", label: "Bassa" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Critica" },
];

const STATUSES = [
  { value: "aperto", label: "Aperto" },
  { value: "in_gestione", label: "In gestione" },
  { value: "risolto", label: "Risolto" },
  { value: "chiuso", label: "Chiuso" },
];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  aperto: { label: "Aperto", className: "bg-blue-100 text-blue-700" },
  in_gestione: { label: "In gestione", className: "bg-yellow-100 text-yellow-700" },
  risolto: { label: "Risolto", className: "bg-emerald-100 text-emerald-700" },
  chiuso: { label: "Chiuso", className: "bg-gray-100 text-gray-500" },
};

interface Paper { id: string; title: string; }

export function FindingEditor({
  findingId,
  initialTitle,
  initialDescription,
  initialRecommendation,
  initialSeverity,
  initialStatus,
  initialResponse,
  initialDueDate,
  initialWorkingPaperId,
  quarterPapers,
  isOwnerOrRevisor,
}: {
  findingId: string;
  initialTitle: string;
  initialDescription: string;
  initialRecommendation: string;
  initialSeverity: string;
  initialStatus: string;
  initialResponse: string;
  initialDueDate: string;
  initialWorkingPaperId: string;
  quarterPapers: Paper[];
  isOwnerOrRevisor: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [recommendation, setRecommendation] = useState(initialRecommendation);
  const [severity, setSeverity] = useState(initialSeverity);
  const [status, setStatus] = useState(initialStatus);
  const [response, setResponse] = useState(initialResponse);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [workingPaperId, setWorkingPaperId] = useState(initialWorkingPaperId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isClosed = status === "chiuso";
  const st = STATUS_STYLES[status] ?? STATUS_STYLES.aperto!;

  const patch = useCallback(async (payload: Record<string, unknown>) => {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch(`/api/audit/findings/${findingId}`, {
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
  }, [findingId]);

  async function handleSave() {
    const ok = await patch({
      title,
      description: description || null,
      recommendation: recommendation || null,
      severity,
      status,
      response: response || null,
      due_date: dueDate || null,
      working_paper_id: workingPaperId || null,
    });
    if (ok) {
      setSaved(true);
      if (status === "chiuso") setTimeout(() => window.location.reload(), 600);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stato badge + salva */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${st.className}`}>
          {st.label}
        </span>
        {!isClosed && (
          <Button type="button" loading={saving} onClick={handleSave}>
            Salva
          </Button>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {saved && !error && <Alert tone="success">Salvato.</Alert>}

      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        {/* Titolo */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Titolo</label>
          {!isClosed ? (
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

        {/* Severità e stato */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Severità</label>
            {!isClosed ? (
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            ) : (
              <p className="text-sm text-gray-700">{SEVERITIES.find(s => s.value === severity)?.label}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Stato</label>
            {!isClosed ? (
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            ) : (
              <p className="text-sm text-gray-700">Chiuso</p>
            )}
          </div>
        </div>

        {/* Scadenza e carta collegata */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Scadenza</label>
            {!isClosed ? (
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            ) : (
              <p className="text-sm text-gray-700">{dueDate ? new Date(dueDate).toLocaleDateString("it-IT") : "—"}</p>
            )}
          </div>
          {quarterPapers.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Carta di lavoro</label>
              {!isClosed ? (
                <select value={workingPaperId} onChange={(e) => setWorkingPaperId(e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">— Nessuna —</option>
                  {quarterPapers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              ) : (
                <p className="text-sm text-gray-700">
                  {quarterPapers.find(p => p.id === workingPaperId)?.title ?? "—"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Descrizione */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Descrizione</label>
          {!isClosed ? (
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              placeholder="Descrizione dettagliata del problema riscontrato..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md border border-gray-200 px-3 py-2 min-h-16">
              {description || <span className="text-gray-400 italic">Nessuna descrizione.</span>}
            </p>
          )}
        </div>

        {/* Raccomandazione */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Raccomandazione</label>
          {!isClosed ? (
            <textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={3}
              placeholder="Azione correttiva raccomandata..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md border border-gray-200 px-3 py-2 min-h-12">
              {recommendation || <span className="text-gray-400 italic">Nessuna raccomandazione.</span>}
            </p>
          )}
        </div>

        {/* Risposta del management */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Risposta del management
            <span className="ml-1 text-xs text-gray-400 font-normal">— come intendono gestirlo</span>
          </label>
          {!isClosed ? (
            <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3}
              placeholder="Risposta ricevuta dall'azienda o azione concordata..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md border border-gray-200 px-3 py-2 min-h-12">
              {response || <span className="text-gray-400 italic">Nessuna risposta registrata.</span>}
            </p>
          )}
        </div>
      </div>

      {isClosed && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Rilievo chiuso — non modificabile.
        </div>
      )}

      {!isClosed && status === "chiuso" && (
        <p className="text-xs text-amber-600">
          Attenzione: portando lo stato a "Chiuso" il rilievo verrà bloccato definitivamente.
        </p>
      )}
    </div>
  );
}
