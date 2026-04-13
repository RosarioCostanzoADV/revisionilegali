import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, { label: string; className: string }> = {
  active:    { label: "Attivo",    className: "bg-green-100 text-green-800" },
  trial:     { label: "Trial",     className: "bg-yellow-100 text-yellow-800" },
  suspended: { label: "Sospeso",   className: "bg-red-100 text-red-800" },
};

export default async function TenantsPage() {
  const admin = createAdminClient();

  const { data: tenants } = await admin
    .from("tenants")
    .select(`id, name, referent_name, status, plan_id, plan_expires_at, created_at, plans ( name )`)
    .order("created_at", { ascending: false });

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("tenant_id")
    .not("tenant_id", "is", null);

  const userCountMap: Record<string, number> = {};
  for (const p of profiles ?? []) {
    if (p.tenant_id) userCountMap[p.tenant_id] = (userCountMap[p.tenant_id] ?? 0) + 1;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Studi</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tenants?.length ?? 0} studio{(tenants?.length ?? 0) !== 1 ? "i" : ""} registrato{(tenants?.length ?? 0) !== 1 ? "i" : ""}
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuovo tenant
        </Link>
      </div>

      {!tenants?.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-gray-500">Nessun tenant ancora creato.</p>
          <Link
            href="/admin/tenants/new"
            className="mt-3 inline-flex h-9 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            Crea il primo tenant
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Studio", "Referente", "Piano", "Utenti", "Stato", "Scadenza", ""].map((h) => (
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
              {tenants.map((t) => {
                const s = statusLabel[t.status] ?? statusLabel.active;
                const plan = (t.plans as { name: string } | null)?.name ?? "—";
                const expires = t.plan_expires_at
                  ? new Date(t.plan_expires_at).toLocaleDateString("it-IT")
                  : "—";
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.referent_name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{plan}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{userCountMap[t.id] ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{expires}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/tenants/${t.id}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        Apri →
                      </Link>
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
