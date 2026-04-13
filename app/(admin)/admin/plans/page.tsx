import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const admin = createAdminClient();

  const { data: plans } = await admin
    .from("plans")
    .select("*")
    .order("max_assignments", { ascending: true });

  // Count tenants per plan
  const { data: tenants } = await admin
    .from("tenants")
    .select("plan_id")
    .not("plan_id", "is", null);

  const tenantCountMap: Record<string, number> = {};
  for (const t of tenants ?? []) {
    if (t.plan_id) tenantCountMap[t.plan_id] = (tenantCountMap[t.plan_id] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Piani</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestisci i piani disponibili per gli studi clienti.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Piano", "Incarichi/anno", "Utenti max", "Storage", "Quota AI", "Moduli", "Studi attivi", "Stato"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(plans ?? []).map((plan) => {
              const modules = [
                plan.vigilance_module && "Vigilanza",
                plan.ai_drafts_module && "Bozze AI",
                plan.advanced_import && "Import avanzato",
              ].filter(Boolean);

              return (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {plan.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{plan.max_assignments}</td>
                  <td className="px-4 py-3 text-gray-700">{plan.max_users}</td>
                  <td className="px-4 py-3 text-gray-700">{plan.storage_gb} GB</td>
                  <td className="px-4 py-3 text-gray-700">
                    {plan.ai_quota ? `${plan.ai_quota}/mese` : "Illimitata"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {modules.length > 0 ? modules.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {tenantCountMap[plan.id] ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        plan.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {plan.is_active ? "Attivo" : "Inattivo"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!plans || plans.length === 0) && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Nessun piano configurato.
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        Per modificare i piani o aggiungerne di nuovi, contatta il team tecnico.
      </div>
    </div>
  );
}
