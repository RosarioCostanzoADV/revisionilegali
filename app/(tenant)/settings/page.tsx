import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TenantSettingsForm } from "./TenantSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  // Only tenant_owner can edit settings
  const canEdit = profile.role === "tenant_owner";

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  if (!tenant) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni studio</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestisci i dati del tuo studio.
        </p>
        <div className="mt-3 flex gap-4 border-b border-gray-200 pb-1 text-sm">
          <span className="border-b-2 border-brand-600 pb-1 font-medium text-brand-600">
            Generale
          </span>
          <Link
            href="/settings/piano"
            className="pb-1 text-gray-500 hover:text-gray-700"
          >
            Piano e utilizzo
          </Link>
        </div>
      </div>

      {canEdit ? (
        <TenantSettingsForm tenant={tenant} />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ["Nome studio", tenant.name],
              ["Referente", tenant.referent_name ?? "—"],
              ["Telefono", tenant.phone ?? "—"],
              ["P.IVA / CF", tenant.vat_number ?? "—"],
              ["Fuso orario", tenant.timezone],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-gray-400">
            Solo il titolare dello studio può modificare queste impostazioni.
          </p>
        </div>
      )}
    </div>
  );
}
