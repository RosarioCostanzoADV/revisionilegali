import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewTenantForm } from "./NewTenantForm";

export const dynamic = "force-dynamic";

export default async function NewTenantPage() {
  const admin = createAdminClient();
  const { data: plans } = await admin
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/tenants" className="text-sm text-brand-600 hover:text-brand-700">
          ← Tutti i tenant
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuovo tenant</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea un nuovo studio e il relativo utente titolare.
        </p>
      </div>
      <NewTenantForm plans={plans ?? []} />
    </div>
  );
}
