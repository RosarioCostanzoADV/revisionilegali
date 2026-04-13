"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface OnboardingInitial {
  name: string;
  referent_name: string;
  phone: string;
  vat_number: string;
  timezone: string;
}

const TIMEZONES = [
  "Europe/Rome",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "UTC",
];

export function OnboardingForm({ initial }: { initial: OnboardingInitial }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof OnboardingInitial>(
    key: K,
    value: OnboardingInitial[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Il nome dello studio è obbligatorio.");
      return;
    }
    if (!form.referent_name.trim()) {
      setError("Il nome del referente è obbligatorio.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/tenants/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        referent_name: form.referent_name.trim(),
        phone: form.phone.trim() || undefined,
        vat_number: form.vat_number.trim() || undefined,
        timezone: form.timezone,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Impossibile salvare i dati. Riprova.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {error && <Alert tone="error">{error}</Alert>}
      <Input
        label="Nome studio *"
        name="name"
        required
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        disabled={loading}
      />
      <Input
        label="Nome referente *"
        name="referent_name"
        required
        value={form.referent_name}
        onChange={(e) => update("referent_name", e.target.value)}
        disabled={loading}
      />
      <Input
        label="Telefono"
        name="phone"
        type="tel"
        value={form.phone}
        onChange={(e) => update("phone", e.target.value)}
        disabled={loading}
      />
      <Input
        label="P.IVA / Codice Fiscale"
        name="vat_number"
        value={form.vat_number}
        onChange={(e) => update("vat_number", e.target.value)}
        disabled={loading}
      />
      <div className="flex flex-col gap-1">
        <label
          htmlFor="timezone"
          className="text-sm font-medium text-gray-700"
        >
          Fuso orario
        </label>
        <select
          id="timezone"
          name="timezone"
          value={form.timezone}
          onChange={(e) => update("timezone", e.target.value)}
          disabled={loading}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-500">
        Potrai caricare il logo dello studio in un secondo momento dalle
        impostazioni.
      </p>
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Salva e continua
        </Button>
      </div>
    </form>
  );
}
