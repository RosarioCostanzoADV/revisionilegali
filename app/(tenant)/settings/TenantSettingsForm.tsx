"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import type { Tenant } from "@/lib/supabase/types";

const TIMEZONES = [
  "Europe/Rome",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "UTC",
];

export function TenantSettingsForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      referent_name: fd.get("referent_name") || null,
      phone: fd.get("phone") || null,
      vat_number: fd.get("vat_number") || null,
      timezone: fd.get("timezone"),
    };

    const res = await fetch("/api/tenant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Errore salvataggio.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Impostazioni salvate correttamente.</Alert>}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Dati studio</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Nome studio *"
              name="name"
              required
              defaultValue={tenant.name}
            />
          </div>
          <Input
            label="Nome referente"
            name="referent_name"
            defaultValue={tenant.referent_name ?? ""}
          />
          <Input
            label="Telefono"
            name="phone"
            type="tel"
            defaultValue={tenant.phone ?? ""}
          />
          <Input
            label="P.IVA / Codice fiscale"
            name="vat_number"
            defaultValue={tenant.vat_number ?? ""}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fuso orario
            </label>
            <select
              name="timezone"
              defaultValue={tenant.timezone}
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Salva modifiche
        </Button>
      </div>
    </form>
  );
}
