"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const ROLE_OPTIONS = [
  { value: "tenant_owner", label: "Titolare" },
  { value: "revisor", label: "Revisore" },
  { value: "collaborator", label: "Collaboratore" },
  { value: "syndic", label: "Sindaco" },
] as const;

export function CreaUtenteForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      tenant_id: tenantId,
      full_name: fd.get("full_name") as string,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      role: fd.get("role") as string,
    };
    setLoading(true);
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Errore creazione utente.");
      return;
    }
    setSuccess("Utente creato correttamente.");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        + Crea utente
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Crea nuovo utente</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); setSuccess(null); }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Chiudi
        </button>
      </div>

      {error && <Alert tone="error" className="mb-3">{error}</Alert>}
      {success && <Alert tone="success" className="mb-3">{success}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nome completo *</label>
            <input
              name="full_name"
              type="text"
              required
              placeholder="Mario Rossi"
              className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Email *</label>
            <input
              name="email"
              type="email"
              required
              placeholder="mario@studio.it"
              className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Password *</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Min. 8 caratteri"
              className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Ruolo *</label>
            <select
              name="role"
              required
              defaultValue="collaborator"
              className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => { setOpen(false); setError(null); setSuccess(null); }}
          >
            Annulla
          </Button>
          <Button type="submit" loading={loading}>
            Crea utente
          </Button>
        </div>
      </form>
    </div>
  );
}
