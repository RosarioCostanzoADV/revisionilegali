"use client";

import { useState, type FormEvent } from "react";
import { apiFetch, setAuthToken } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface LoginFormProps {
  initialError?: string | null;
  redirectTo?: string;
}

export function LoginForm({ initialError, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.access_token) {
      setLoading(false);
      setError(
        typeof data.error === "string"
          ? data.error
          : "Email o password non corretti.",
      );
      return;
    }

    setAuthToken(data.access_token);

    const target =
      redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    window.location.href = target;
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
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      <Button type="submit" loading={loading}>
        Accedi
      </Button>
    </form>
  );
}
