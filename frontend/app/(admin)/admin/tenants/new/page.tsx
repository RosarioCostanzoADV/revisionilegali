import Link from "next/link";
import { gwJson } from "@/lib/api";
import { NewTenantForm } from "./NewTenantForm";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewTenantPage() {
  const plans = await gwJson<Plan[]>("/api/plans?active=true");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/tenants" className="text-sm text-brand-600 hover:text-brand-700">← Tutti i tenant</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuovo tenant</h1>
        <p className="mt-1 text-sm text-gray-500">Crea un nuovo studio e il relativo utente titolare.</p>
      </div>
      <NewTenantForm plans={plans ?? []} />
    </div>
  );
}
