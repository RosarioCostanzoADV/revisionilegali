import Link from "next/link";
import { gwJson } from "@/lib/api";
import { UsersClient } from "./UsersClient";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor:      "Revisore",
  collaborator: "Collaboratore",
  syndic:       "Sindaco",
};

export default async function UtentiPage() {
  const [me, users] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{ id: string; full_name: string | null; role: string; is_active: boolean; created_at: string }[]>("/api/auth/users"),
  ]);

  if (!me) return null;

  const canManage = me.profile.role === "tenant_owner";
  const maxUsers = me.plan?.max_users ?? null;
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
