import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Imposta nuova password
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Scegli una password di almeno 8 caratteri.
        </p>
      </div>
      <UpdatePasswordForm />
    </div>
  );
}
