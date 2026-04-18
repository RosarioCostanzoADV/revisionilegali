"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import type { Plan } from "@/lib/supabase/types";

export function NewTenantForm({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      tenant_name: fd.get("tenant_name"),
      owner_email: fd.get("owner_email"),
      owner_name: fd.get("owner_name"),
      owner_password: fd.get("owner_password"),
      plan_id: fd.get("plan_id") || null,
      status: fd.get("status") ?? "active",
    };

    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Errore durante la creazione del tenant.",
      );
      setLoading(false);
      return;
    }

    router.push(`/admin/tenants/${data.tenant_id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Dati studio</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Nome studio *" name="tenant_name" required placeholder="Studio Legale Rossi" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Stato
            </label>
            <select
              name="status"
              defaultValue="active"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="active">Attivo</option>
              <option value="trial">Trial</option>
              <option value="suspended">Sospeso</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Piano
            </label>
            <select
              name="plan_id"
              defaultValue=""
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— Nessun piano —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Utente titolare (tenant owner)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome completo *" name="owner_name" required placeholder="Mario Rossi" />
          <Input label="Email *" name="owner_email" type="email" required placeholder="mario@studio.it" />
          <div className="sm:col-span-2">
            <Input
              label="Password iniziale *"
              name="owner_password"
              type="password"
              required
              placeholder="min. 8 caratteri"
              minLength={8}
            />
            <p className="mt-1 text-xs text-gray-500">
              L'utente potrà cambiarla tramite "Password dimenticata".
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Annulla
        </Button>
        <Button type="submit" loading={loading}>
          Crea tenant
        </Button>
      </div>
    </form>
  );
}
