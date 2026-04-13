"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const STATUSES = [
  { value: "aperto", label: "Aperto" },
  { value: "in_corso", label: "In corso" },
  { value: "chiuso", label: "Chiuso" },
];

export function AssignmentStatusForm({
  assignmentId,
  currentStatus,
}: {
  assignmentId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const res = await fetch(`/api/tenant/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }

    setSaved(true);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Stato incarico</h2>
      {error && <Alert tone="error" className="mb-3">{error}</Alert>}
      {saved && <Alert tone="success" className="mb-3">Stato aggiornato.</Alert>}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setSaved(false); }}
          className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Button type="submit" loading={loading} disabled={status === currentStatus && !loading}>
          Salva
        </Button>
      </form>
    </div>
  );
}
