import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const errorKey = sp.error;
  const errorMessage =
    errorKey === "account_disabled"
      ? "Il tuo account è stato disattivato. Contatta il supporto."
      : errorKey === "no_tenant"
        ? "Il tuo utente non è collegato a nessuno studio. Contatta il supporto."
        : errorKey === "tenant_missing"
          ? "Lo studio associato al tuo account non esiste più."
          : null;

  return (
    <div className="flex flex-col gap-7">

      {/* Heading */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal-600">
          Accesso
        </p>
        <h2 className="text-2xl font-bold text-gray-900">Bentornato</h2>
        <p className="mt-1 text-sm text-gray-500">
          Inserisci le tue credenziali per accedere al tuo studio.
        </p>
      </div>

      {/* Form */}
      <LoginForm initialError={errorMessage} redirectTo={sp.redirectTo} />

      {/* Links */}
      <div className="text-center text-sm">
        <Link
          href="/reset-password"
          className="text-brand-600 hover:text-brand-700 hover:underline"
        >
          Password dimenticata?
        </Link>
      </div>

    </div>
  );
}
