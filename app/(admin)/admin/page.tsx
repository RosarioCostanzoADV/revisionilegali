import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const admin = createAdminClient();

  const [
    { count: tenantCount },
    { count: userCount },
    { count: planCount },
    { count: assignmentCount },
    { count: companyCount },
    { count: paperCount },
    { count: findingCount },
    { data: tenants },
    { data: recentTenants },
  ] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("user_profiles").select("id", { count: "exact", head: true }).not("tenant_id", "is", null),
    admin.from("plans").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("assignments").select("id", { count: "exact", head: true }),
    admin.from("companies").select("id", { count: "exact", head: true }),
    admin.from("working_papers").select("id", { count: "exact", head: true }),
    admin.from("findings").select("id", { count: "exact", head: true }),
    admin.from("tenants").select("status"),
    admin
      .from("tenants")
      .select("id, name, status, created_at, plans ( name )")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const statusCounts = { active: 0, trial: 0, suspended: 0 };
  for (const t of tenants ?? []) {
    const s = t.status as keyof typeof statusCounts;
    if (s in statusCounts) statusCounts[s]++;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pannello Super Admin</h1>
        <p className="mt-1 text-sm text-gray-600">Panoramica generale della piattaforma.</p>
      </div>

      {/* Stat primarie */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Studi" value={tenantCount ?? 0} />
        <Stat label="Utenti" value={userCount ?? 0} />
        <Stat label="Incarichi" value={assignmentCount ?? 0} />
        <Stat label="Aziende" value={companyCount ?? 0} />
        <Stat label="Carte di lavoro" value={paperCount ?? 0} />
        <Stat label="Rilievi" value={findingCount ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Studi per stato */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Studi per stato</h2>
          <div className="space-y-3">
            <StatusRow label="Attivi" count={statusCounts.active} total={tenantCount ?? 0} color="bg-green-500" />
            <StatusRow label="Trial" count={statusCounts.trial} total={tenantCount ?? 0} color="bg-yellow-400" />
            <StatusRow label="Sospesi" count={statusCounts.suspended} total={tenantCount ?? 0} color="bg-red-400" />
          </div>
        </div>

        {/* Piano overview */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Piani disponibili</h2>
          <p className="text-3xl font-bold text-gray-900">{planCount ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500">piani attivi configurati</p>
          <Link
            href="/admin/plans"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Gestisci piani →
          </Link>
        </div>

        {/* Link rapidi */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Azioni rapide</h2>
          <div className="space-y-2">
            <Link
              href="/admin/tenants/new"
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              + Crea nuovo studio
            </Link>
            <Link
              href="/admin/tenants"
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Gestisci tutti gli studi →
            </Link>
          </div>
        </div>
      </div>

      {/* Studi recenti */}
      {(recentTenants ?? []).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Studi creati di recente</h2>
            <Link href="/admin/tenants" className="text-sm text-brand-600 hover:text-brand-700">
              Vedi tutti →
            </Link>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Studio", "Piano", "Stato", "Data creazione"].map((h) => (
                  <th key={h} className="pb-2 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentTenants!.map((t) => {
                const planRaw = t.plans as unknown as { name: string } | { name: string }[] | null;
                const plan = Array.isArray(planRaw) ? (planRaw[0]?.name ?? "—") : (planRaw?.name ?? "—");
                const statusMap: Record<string, { label: string; className: string }> = {
                  active:    { label: "Attivo",  className: "bg-green-100 text-green-800" },
                  trial:     { label: "Trial",   className: "bg-yellow-100 text-yellow-800" },
                  suspended: { label: "Sospeso", className: "bg-red-100 text-red-800" },
                };
                const s = statusMap[t.status] ?? statusMap.active!;
                return (
                  <tr key={t.id}>
                    <td className="py-2 font-medium text-gray-900">
                      <Link href={`/admin/tenants/${t.id}`} className="hover:text-brand-600">
                        {t.name}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-600">{plan}</td>
                    <td className="py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s!.className}`}>
                        {s!.label}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(t.created_at).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function StatusRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{count}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
