import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PianoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const { data: tenant } = await supabase
    .from("tenants")
    .select(`
      id, name, status, plan_id, plan_expires_at,
      plans ( id, name, max_assignments, max_users, storage_gb,
              ai_quota, vigilance_module, ai_drafts_module, advanced_import )
    `)
    .eq("id", profile.tenant_id)
    .maybeSingle();

  if (!tenant) redirect("/dashboard");

  // Count active users in this tenant
  const { count: userCount } = await supabase
    .from("user_profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true);

  const plan = (tenant.plans as Record<string, unknown> | null);
  const expires = tenant.plan_expires_at
    ? new Date(tenant.plan_expires_at).toLocaleDateString("it-IT")
    : null;

  const statusLabel: Record<string, string> = {
    active: "Attivo",
    trial: "Trial",
    suspended: "Sospeso",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni studio</h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci i dati del tuo studio.</p>
        <div className="mt-3 flex gap-4 border-b border-gray-200 pb-1 text-sm">
          <Link href="/settings" className="pb-1 text-gray-500 hover:text-gray-700">
            Generale
          </Link>
          <span className="border-b-2 border-brand-600 pb-1 font-medium text-brand-600">
            Piano e utilizzo
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Piano attivo */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Piano attivo</h2>
          {plan ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">{String(plan.name)}</span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  {statusLabel[tenant.status] ?? tenant.status}
                </span>
              </div>
              {expires && (
                <p className="text-sm text-gray-500">
                  Scadenza: <strong>{expires}</strong>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nessun piano attivo. Contatta il supporto.</p>
          )}
        </div>

        {/* Limiti utilizzo */}
        {plan && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Limiti piano</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: "Incarichi annui", value: String(plan.max_assignments) },
                { label: "Utenti inclusi", used: userCount ?? 0, max: Number(plan.max_users) },
                { label: "Storage", value: `${String(plan.storage_gb)} GB` },
                { label: "Quota AI", value: plan.ai_quota ? `${String(plan.ai_quota)} chiamate/mese` : "Illimitata" },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  {"used" in item ? (
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {item.used} / {item.max}
                    </p>
                  ) : (
                    <p className="mt-1 text-base font-semibold text-gray-900">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Moduli attivi */}
        {plan && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Moduli inclusi</h2>
            <div className="space-y-2 text-sm">
              {[
                { key: "vigilance_module", label: "Modulo vigilanza / collegio sindacale" },
                { key: "ai_drafts_module", label: "Generazione bozze con AI" },
                { key: "advanced_import", label: "Import contabile avanzato" },
              ].map(({ key, label }) => {
                const active = Boolean(plan[key]);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`text-base ${active ? "text-green-600" : "text-gray-300"}`}>
                      {active ? "✓" : "✗"}
                    </span>
                    <span className={active ? "text-gray-900" : "text-gray-400"}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          Per modificare il piano o richiedere un upgrade, contatta il supporto.
        </div>
      </div>
    </div>
  );
}
