import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor: "Revisore",
  collaborator: "Collaboratore",
  syndic: "Sindaco",
};

export default async function UtentiPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const canManage = profile.role === "tenant_owner";

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("user_profiles")
    .select("id, full_name, role, is_active, created_at")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at");

  const { data: tenant } = await admin
    .from("tenants")
    .select("plans ( max_users )")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  const maxUsers = (tenant?.plans as { max_users: number } | null)?.max_users ?? null;
  const activeCount = (users ?? []).filter((u) => u.is_active).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni studio</h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci i dati del tuo studio.</p>
        <div className="mt-3 flex gap-4 border-b border-gray-200 pb-1 text-sm">
          <Link href="/settings" className="pb-1 text-gray-500 hover:text-gray-700">Generale</Link>
          <Link href="/settings/piano" className="pb-1 text-gray-500 hover:text-gray-700">Piano e utilizzo</Link>
          <span className="border-b-2 border-brand-600 pb-1 font-medium text-brand-600">Utenti</span>
        </div>
      </div>

      <UsersClient
        initialUsers={users ?? []}
        canManage={canManage}
        roleLabels={ROLE_LABELS}
        activeCount={activeCount}
        maxUsers={maxUsers}
      />
    </div>
  );
}
