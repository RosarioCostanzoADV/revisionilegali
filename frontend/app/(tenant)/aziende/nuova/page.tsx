import Link from "next/link";
import { NuovaAziendaForm } from "./NuovaAziendaForm";

export const dynamic = "force-dynamic";

export default function NuovaAziendaPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/aziende" className="text-sm text-brand-600 hover:text-brand-700">← Tutte le aziende</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuova azienda</h1>
      </div>
      <NuovaAziendaForm />
    </div>
  );
}
