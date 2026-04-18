"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface Company {
  id: string;
  name: string;
  fiscal_code: string | null;
  vat_number: string | null;
  sector: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  notes: string | null;
}

export function ModificaAziendaForm({ company }: { company: Company }) {
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
      fiscal_code: fd.get("fiscal_code") || null,
      vat_number: fd.get("vat_number") || null,
      sector: fd.get("sector") || null,
      address: fd.get("address") || null,
      city: fd.get("city") || null,
      province: fd.get("province") || null,
      notes: fd.get("notes") || null,
    };

    const res = await fetch(`/api/tenant/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore durante il salvataggio.");
      return;
    }

    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">Modifiche salvate.</Alert>}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Dati anagrafici</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Ragione sociale *" name="name" required defaultValue={company.name} />
          </div>
          <Input label="Codice fiscale" name="fiscal_code" defaultValue={company.fiscal_code ?? ""} />
          <Input label="Partita IVA" name="vat_number" defaultValue={company.vat_number ?? ""} />
          <Input label="Settore / Attività" name="sector" defaultValue={company.sector ?? ""} />
          <div className="sm:col-span-2">
            <Input label="Indirizzo" name="address" defaultValue={company.address ?? ""} />
          </div>
          <Input label="Città" name="city" defaultValue={company.city ?? ""} />
          <Input label="Provincia" name="province" maxLength={5} defaultValue={company.province ?? ""} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Note</h2>
        <textarea
          name="notes"
          rows={3}
          defaultValue={company.notes ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>Salva modifiche</Button>
      </div>
    </form>
  );
}
