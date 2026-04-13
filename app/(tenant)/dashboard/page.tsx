import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor: "Revisore",
  collaborator: "Collaboratore",
  syndic: "Sindaco",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: tenant } = profile?.tenant_id
    ? await supabase
        .from("tenants")
        .select("name, status, plan_id")
        .eq("id", profile.tenant_id)
        .maybeSingle()
    : { data: null };

  const { data: plan } = tenant?.plan_id
    ? await supabase
        .from("plans")
        .select("name, max_assignments, max_users, storage_gb")
        .eq("id", tenant.plan_id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Benvenuto{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Questa è la tua dashboard. Il modulo incarichi arriverà presto.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Studio" value={tenant?.name ?? "—"} />
        <Card title="Ruolo" value={ROLE_LABELS[profile?.role ?? ""] ?? profile?.role ?? "—"} />
        <Card title="Piano" value={plan?.name ?? "Non assegnato"} />
      </div>

      {plan && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Dettagli piano
          </h2>
          <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div>
              <dt className="text-gray-500">Incarichi max</dt>
              <dd className="font-medium">{plan.max_assignments}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Utenti max</dt>
              <dd className="font-medium">{plan.max_users}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Storage</dt>
              <dd className="font-medium">{plan.storage_gb} GB</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}
