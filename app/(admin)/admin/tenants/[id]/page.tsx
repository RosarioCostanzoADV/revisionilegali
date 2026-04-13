import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TenantActions } from "./TenantActions";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, { label: string; className: string }> = {
  active:    { label: "Attivo",    className: "bg-green-100 text-green-800" },
  trial:     { label: "Trial",     className: "bg-yellow-100 text-yellow-800" },
  suspended: { label: "Sospeso",   className: "bg-red-100 text-red-800" },
};

const roleLabel: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor:      "Revisore",
  collaborator: "Collaboratore",
  syndic:       "Sindaco",
};

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [
    { data: tenant },
    { data: plans },
    { count: assignmentCount },
    { count: companyCount },
    { count: paperCount },
    { count: findingCount },
    { count: documentCount },
    { count: importCount },
  ] = await Promise.all([
    admin.from("tenants").select(`*, plans ( * )`).eq("id", id).maybeSingle(),
    admin.from("plans").select("*").eq("is_active", true).order("name"),
    admin.from("assignments").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    admin.from("companies").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    admin.from("working_papers").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    admin.from("findings").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    admin.from("documents").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    admin.from("accounting_imports").select("id", { count: "exact", head: true }).eq("tenant_id", id),
  ]);

  if (!tenant) notFound();

  const { data: users } = await admin
    .from("user_profiles")
    .select("id, role, full_name, is_active, created_at")
    .eq("tenant_id", id)
    .order("created_at");

  const plan = (tenant.plans as Record<string, unknown> | null);
  const s = statusLabel[tenant.status] ?? statusLabel.active;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/tenants" className="text-sm text-brand-600 hover:text-brand-700">
            ← Tutti i tenant
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
              {s.label}
            </span>
            {plan && (
              <span className="text-sm text-gray-500">
                Piano: <strong>{String(plan.name)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: info + users */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info generali */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Informazioni</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Referente", tenant.referent_name ?? "—"],
                ["Telefono", tenant.phone ?? "—"],
                ["P.IVA / CF", tenant.vat_number ?? "—"],
                ["Timezone", tenant.timezone],
                ["Onboarding", tenant.onboarding_completed ? "Completato" : "In attesa"],
                ["Creato il", new Date(tenant.created_at).toLocaleDateString("it-IT")],
                ["Scadenza piano", tenant.plan_expires_at
                  ? new Date(tenant.plan_expires_at).toLocaleDateString("it-IT")
                  : "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Utilizzo piattaforma */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Utilizzo piattaforma</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {[
                { label: "Incarichi", value: assignmentCount ?? 0 },
                { label: "Aziende", value: companyCount ?? 0 },
                { label: "Utenti", value: users?.length ?? 0 },
                { label: "Carte", value: paperCount ?? 0 },
                { label: "Rilievi", value: findingCount ?? 0 },
                { label: "Documenti", value: documentCount ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-md border border-gray-100 bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-0.5 text-xl font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            {(importCount ?? 0) > 0 && (
              <p className="mt-3 text-xs text-gray-400">{importCount} import contabili caricati</p>
            )}
          </div>

          {/* Utenti */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              Utenti ({users?.length ?? 0})
            </h2>
            {!users?.length ? (
              <p className="text-sm text-gray-400">Nessun utente ancora.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Nome", "Ruolo", "Stato"].map((h) => (
                      <th key={h} className="pb-2 text-left text-xs font-medium text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 font-medium text-gray-900">{u.full_name ?? "—"}</td>
                      <td className="py-2 text-gray-600">{roleLabel[u.role] ?? u.role}</td>
                      <td className="py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {u.is_active ? "Attivo" : "Disattivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div>
          <TenantActions
            tenantId={tenant.id}
            currentStatus={tenant.status}
            currentPlanId={tenant.plan_id}
            plans={plans ?? []}
          />
        </div>
      </div>
    </div>
  );
}
