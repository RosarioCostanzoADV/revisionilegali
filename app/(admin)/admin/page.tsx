import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = createClient();

  const [{ count: tenantCount }, { count: userCount }, { count: planCount }] =
    await Promise.all([
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("plans")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Pannello Super Admin
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Panoramica generale della piattaforma.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Studi totali" value={tenantCount ?? 0} />
        <Stat label="Utenti totali" value={userCount ?? 0} />
        <Stat label="Piani attivi" value={planCount ?? 0} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
