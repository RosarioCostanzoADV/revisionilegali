import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Password dimenticata
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Inserisci la tua email: ti invieremo un link per reimpostare la
          password.
        </p>
      </div>
      <ResetPasswordForm />
      <div className="text-sm">
        <Link
          href="/login"
          className="text-brand-600 hover:text-brand-700 hover:underline"
        >
          ← Torna al login
        </Link>
      </div>
    </div>
  );
}
