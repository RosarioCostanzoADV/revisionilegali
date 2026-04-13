"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const ROLES = [
  { value: "collaborator", label: "Collaboratore" },
  { value: "revisor", label: "Revisore" },
  { value: "syndic", label: "Sindaco" },
];

export function NuovoUtenteForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tenant/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fd.get("full_name"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore creazione utente.");
      return;
    }

    (e.target as HTMLFormElement).reset();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-700">Aggiungi utente</h3>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nome completo *" name="full_name" required />
        <Input label="Email *" name="email" type="email" required />
        <Input label="Password *" name="password" type="password" required />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Ruolo *</label>
          <select
            name="role"
            required
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Annulla</Button>
        <Button type="submit" loading={loading}>Crea utente</Button>
      </div>
    </form>
  );
}
