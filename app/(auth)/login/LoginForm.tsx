"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface LoginFormProps {
  initialError?: string | null;
  redirectTo?: string;
}

export function LoginForm({ initialError, redirectTo }: LoginFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      if (signInError?.message?.toLowerCase().includes("invalid")) {
        setError("Email o password non corretti.");
      } else {
        setError(signInError?.message ?? "Accesso non riuscito. Riprova.");
      }
      return;
    }

    // Extra check: is the profile active?
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Il tuo account è stato disattivato. Contatta il supporto.");
      return;
    }

    // Let the middleware figure out the correct destination.
    const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";
    router.push(target);
    router.refresh();
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
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          disabled={loading}
        />
        Ricordami su questo dispositivo
      </label>
      <Button type="submit" loading={loading}>
        Accedi
      </Button>
    </form>
  );
}
