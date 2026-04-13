"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const TYPES = [
  { value: "revisione_legale", label: "Revisione legale" },
  { value: "collegio_sindacale", label: "Collegio sindacale" },
  { value: "sindaco_unico", label: "Sindaco unico" },
];

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor: "Revisore",
  collaborator: "Collaboratore",
  syndic: "Sindaco",
};

interface Company { id: string; name: string; }
interface User { id: string; full_name: string | null; role: string; }

export function NuovoIncaricoForm({ companies, users }: { companies: Company[]; users: User[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const currentYear = new Date().getFullYear();

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tenant/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: fd.get("company_id"),
        year: Number(fd.get("year")),
        type: fd.get("type"),
        notes: fd.get("notes") || null,
        member_ids: selectedMembers,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }

    const data = await res.json();
    window.location.href = `/incarichi/${data.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Dettagli incarico</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Azienda *</label>
          <select name="company_id" required className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— Seleziona azienda —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Anno *</label>
            <input
              name="year"
              type="number"
              min={2000}
              max={2100}
              defaultValue={currentYear}
              required
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo *</label>
            <select name="type" required className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {users.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Team assegnato</h2>
          <div className="space-y-2">
            {users.map((u) => (
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

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => window.location.href = "/incarichi"}>
          Annulla
        </Button>
        <Button type="submit" loading={loading}>Crea incarico</Button>
      </div>
    </form>
  );
}
