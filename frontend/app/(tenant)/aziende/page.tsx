import Link from "next/link";
import { gwJson } from "@/lib/api";
import { AziendeClient } from "./AziendeClient";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AziendePage() {
  const [me, companies] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{ id: string; name: string; fiscal_code: string | null; vat_number: string | null; sector: string | null; city: string | null; province: string | null; is_archived: boolean; created_at: string }[]>("/api/companies"),
  ]);

  if (!me) return null;

  const canCreate = ["tenant_owner", "revisor"].includes(me.profile.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aziende</h1>
          <p className="mt-1 text-sm text-gray-500">Anagrafica dei clienti revisionati.</p>
        </div>
        {canCreate && (
          <Link
            href="/aziende/nuova"
            className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuova azienda
          </Link>
        )}
      </div>

      <AziendeClient initialCompanies={companies ?? []} />
    </div>
  );
}
