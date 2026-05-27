"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore invio email.");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <Alert tone="success">
        Ti abbiamo inviato un link per reimpostare la password. Controlla la
        casella di posta.
      </Alert>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {error && <Alert tone="error">{error}</Alert>}
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <Button type="submit" loading={loading}>
        Invia link di reset
      </Button>
    </form>
  );
}
