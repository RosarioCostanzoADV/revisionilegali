"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  full_name: string | null;
  phone: string | null;
  signature_text: string | null;
  role: string;
}

export function ProfiloForm({ profile }: { profile: UserProfile }) {
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  async function handleProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const res = await fetch("/api/tenant/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fd.get("full_name") as string,
        phone: (fd.get("phone") as string) || null,
        signature_text: (fd.get("signature_text") as string) || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setProfileError(typeof data.error === "string" ? data.error : "Errore salvataggio.");
      return;
    }
    setProfileSuccess("Profilo aggiornato.");
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);
    const fd = new FormData(e.currentTarget);
    const newPassword = fd.get("new_password") as string;
    const confirm = fd.get("confirm_password") as string;
    if (newPassword !== confirm) {
      setPwdError("Le password non coincidono.");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    setPwdSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwdSaving(false);
    if (error) {
      setPwdError(error.message);
      return;
    }
    setPwdSuccess("Password aggiornata.");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="space-y-6">
      {/* Dati personali */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Dati personali</h2>
        {profileError && <Alert tone="error" className="mb-4">{profileError}</Alert>}
        {profileSuccess && <Alert tone="success" className="mb-4">{profileSuccess}</Alert>}
        <form onSubmit={handleProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome completo *</label>
              <input
                name="full_name"
                type="text"
                required
                defaultValue={profile.full_name ?? ""}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefono</label>
              <input
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ""}
                placeholder="es. +39 02 1234567"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Firma (testo)</label>
            <textarea
              name="signature_text"
              rows={3}
              defaultValue={profile.signature_text ?? ""}
              placeholder="Testo che verrà usato come firma nei documenti generati..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Usata come firma nelle bozze e nei verbali generati.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>Salva modifiche</Button>
          </div>
        </form>
      </div>

      {/* Cambio password */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Cambia password</h2>
        {pwdError && <Alert tone="error" className="mb-4">{pwdError}</Alert>}
        {pwdSuccess && <Alert tone="success" className="mb-4">{pwdSuccess}</Alert>}
        <form onSubmit={handlePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nuova password *</label>
              <input
                name="new_password"
                type="password"
                required
                minLength={8}
                placeholder="Min. 8 caratteri"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Conferma password *</label>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={8}
                placeholder="Ripeti la nuova password"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pwdSaving}>Aggiorna password</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
