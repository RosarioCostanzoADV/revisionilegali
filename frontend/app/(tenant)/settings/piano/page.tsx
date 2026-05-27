import Link from "next/link";
import { gwJson } from "@/lib/api";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PianoPage() {
  const me = await gwJson<MeResponse>("/api/auth/me");
  if (!me) return null;

  const tenant = me.tenant;
  const plan = me.plan;
  const expires = tenant?.plan_expires_at
    ? new Date(tenant.plan_expires_at).toLocaleDateString("it-IT")
    : null;

  // Count active users via the users endpoint
  const users = await gwJson<{ is_active: boolean }[]>("/api/auth/users");
  const userCount = (users ?? []).filter((u) => u.is_active).length;

  const statusLabel: Record<string, string> = {
    active:    "Attivo",
    trial:     "Trial",
    suspended: "Sospeso",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni studio</h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci i dati del tuo studio.</p>
        <div className="mt-3 flex gap-4 border-b border-gray-200 pb-1 text-sm">
          <Link href="/settings" className="pb-1 text-gray-500 hover:text-gray-700">Generale</Link>
          <span className="border-b-2 border-brand-600 pb-1 font-medium text-brand-600">Piano e utilizzo</span>
          <Link href="/settings/utenti" className="pb-1 text-gray-500 hover:text-gray-700">Utenti</Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Piano attivo</h2>
          {plan ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">{plan.name}</span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  {statusLabel[tenant?.status ?? ""] ?? tenant?.status}
                </span>
              </div>
              {expires && (
                <p className="text-sm text-gray-500">Scadenza: <strong>{expires}</strong></p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nessun piano attivo. Contatta il supporto.</p>
          )}
        </div>

        {plan && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Limiti piano</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: "Incarichi annui", value: String(plan.max_assignments) },
                { label: "Utenti inclusi", used: userCount, max: plan.max_users },
                { label: "Storage", value: `${plan.storage_gb} GB` },
                { label: "Quota AI", value: plan.ai_quota ? `${plan.ai_quota} chiamate/mese` : "Illimitata" },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  {"used" in item ? (
                    <p className="mt-1 text-base font-semibold text-gray-900">{item.used} / {item.max}</p>
                  ) : (
                    <p className="mt-1 text-base font-semibold text-gray-900">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {plan && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Moduli attivi</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Modulo vigilanza", active: plan.vigilance_module },
                { label: "Bozze AI", active: plan.ai_drafts_module },
                { label: "Import avanzato", active: plan.advanced_import },
              ].map(({ label, active }) => (
                <div key={label} className={`rounded-md border p-3 ${active ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                  <span className={`text-xs font-medium ${active ? "text-green-700" : "text-gray-400"}`}>
                    {active ? "✓ " : "✗ "}{label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
