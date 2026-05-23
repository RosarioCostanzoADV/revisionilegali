"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const STATUSES = [
  { value: "aperto", label: "Aperto" },
  { value: "in_corso", label: "In corso" },
  { value: "chiuso", label: "Chiuso" },
];

export function QuarterStatusForm({
  quarterId,
  currentStatus,
  currentNotes,
}: {
  quarterId: string;
  currentStatus: string;
  currentNotes: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty = status !== currentStatus || notes !== currentNotes;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const res = await fetch(`/api/quarters/${quarterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: notes || null }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }

    setSaved(true);
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Stato e note</h2>
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">Salvato.</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Stato</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setSaved(false); }}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {status === "chiuso" && (
            <p className="mt-1 text-xs text-amber-600">
              Attenzione: la chiusura registra la data odierna come data di chiusura formale.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            rows={3}
            placeholder="Osservazioni, criticità rilevate, attività svolte..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={loading} disabled={!isDirty && !loading}>
            Salva
          </Button>
        </div>
      </form>
    </div>
  );
}
