"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { apiFetch } from "@/lib/client-api";

export function NuovaAziendaForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      fiscal_code: fd.get("fiscal_code") || null,
      vat_number: fd.get("vat_number") || null,
      sector: fd.get("sector") || null,
      address: fd.get("address") || null,
      city: fd.get("city") || null,
      province: fd.get("province") || null,
      notes: fd.get("notes") || null,
    };

    const res = await apiFetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }

    const data = await res.json();
    window.location.href = `/aziende/${data.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Dati anagrafici</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Ragione sociale *" name="name" required />
          </div>
          <Input label="Codice fiscale" name="fiscal_code" />
          <Input label="Partita IVA" name="vat_number" />
          <Input label="Settore / Attività" name="sector" />
          <div className="sm:col-span-2">
            <Input label="Indirizzo" name="address" />
          </div>
          <Input label="Città" name="city" />
          <Input label="Provincia" name="province" placeholder="es. MI" maxLength={5} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Note</h2>
        <textarea
          name="notes"
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          placeholder="Note interne sull'azienda..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => window.location.href = "/aziende"}>
          Annulla
        </Button>
        <Button type="submit" loading={loading}>
          Salva azienda
        </Button>
      </div>
    </form>
  );
}
