import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AziendeClient } from "./AziendeClient";

export const dynamic = "force-dynamic";

export default async function AziendePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, fiscal_code, vat_number, sector, city, province, is_archived, created_at")
    .order("name");

  const canCreate = ["tenant_owner", "revisor"].includes(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aziende</h1>
          <p className="mt-1 text-sm text-gray-500">
            Anagrafica dei clienti revisionati.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/aziende/nuova"
            className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuova azienda
          </Link>
        )}
      </div>

      <AziendeClient initialCompanies={companies ?? []} />
    </div>
  );
}
