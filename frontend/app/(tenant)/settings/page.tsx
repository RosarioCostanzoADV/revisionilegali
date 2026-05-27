import Link from "next/link";
import { gwJson } from "@/lib/api";
import { TenantSettingsForm } from "./TenantSettingsForm";
import type { MeResponse, Tenant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await gwJson<MeResponse>("/api/auth/me");
  if (!me) return null;

  const canEdit = me.profile.role === "tenant_owner";
  const tenant = me.tenant as Tenant | null;
  if (!tenant) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni studio</h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci i dati del tuo studio.</p>
        <div className="mt-3 flex gap-4 border-b border-gray-200 pb-1 text-sm">
          <span className="border-b-2 border-brand-600 pb-1 font-medium text-brand-600">Generale</span>
          <Link href="/settings/piano" className="pb-1 text-gray-500 hover:text-gray-700">Piano e utilizzo</Link>
          <Link href="/settings/utenti" className="pb-1 text-gray-500 hover:text-gray-700">Utenti</Link>
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
