"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const STATUSES = [
  { value: "aperto", label: "Aperto" },
  { value: "in_corso", label: "In corso" },
  { value: "chiuso", label: "Chiuso" },
];

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor: "Revisore",
  collaborator: "Collaboratore",
  syndic: "Sindaco",
};

export function ModificaIncaricoForm({
  assignmentId,
  currentStatus,
  currentMemberIds,
  allUsers,
  notes,
}: {
  assignmentId: string;
  currentStatus: string;
  currentMemberIds: string[];
  allUsers: UserProfile[];
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(currentMemberIds);
  const [currentNotes, setCurrentNotes] = useState(notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const res = await fetch(`/api/tenant/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        notes: currentNotes || null,
        member_ids: selectedMembers,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }

    setSaved(true);
    setTimeout(() => window.location.reload(), 800);
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Modifica incarico
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Modifica incarico</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Annulla
        </button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">Salvato con successo.</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Stato */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Stato</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
          <textarea
            value={currentNotes}
            onChange={(e) => setCurrentNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Team */}
        {allUsers.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Team assegnato</label>
            <div className="space-y-2 rounded-md border border-gray-200 p-3">
              {allUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u.id)}
                    onChange={() => toggleMember(u.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  />
                  <span className="font-medium text-gray-900">{u.full_name ?? "—"}</span>
                  <span className="text-gray-400">{ROLE_LABELS[u.role] ?? u.role}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>Salva modifiche</Button>
        </div>
      </form>
    </div>
  );
}
