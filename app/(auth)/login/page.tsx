import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; redirectTo?: string };
}) {
  const errorKey = searchParams?.error;
  const errorMessage =
    errorKey === "account_disabled"
      ? "Il tuo account è stato disattivato. Contatta il supporto."
      : errorKey === "no_tenant"
        ? "Il tuo utente non è collegato a nessuno studio. Contatta il supporto."
        : errorKey === "tenant_missing"
          ? "Lo studio associato al tuo account non esiste più."
          : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Accedi</h2>
        <p className="mt-1 text-sm text-gray-500">
          Inserisci le tue credenziali per accedere al tuo studio.
        </p>
      </div>
      <LoginForm initialError={errorMessage} redirectTo={searchParams?.redirectTo} />
      <div className="flex items-center justify-between text-sm">
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
