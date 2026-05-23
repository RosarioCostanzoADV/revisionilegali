import { notFound } from "next/navigation";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { AziendaActions } from "./AziendaActions";
import { ModificaAziendaForm } from "./ModificaAziendaForm";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AziendaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [me, company] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; name: string; fiscal_code?: string; vat_number?: string;
      sector?: string; address?: string; city?: string; province?: string;
      notes?: string; is_archived: boolean;
    }>(`/api/companies/${id}`),
  ]);

  if (!company) notFound();

  const canEdit = me ? ["tenant_owner", "revisor"].includes(me.profile.role) : false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/aziende" className="text-sm text-brand-600 hover:text-brand-700">← Tutte le aziende</Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          {company.is_archived && (
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-sm text-gray-500">Archiviata</span>
          )}
        </div>
      </div>

      {canEdit && <ModificaAziendaForm company={company} />}

      {!canEdit && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {([
              ["Ragione sociale", company.name],
              ["Codice fiscale", company.fiscal_code ?? "—"],
              ["Partita IVA", company.vat_number ?? "—"],
              ["Settore", company.sector ?? "—"],
              ["Indirizzo", company.address ?? "—"],
              ["Città", company.city ? `${company.city}${company.province ? ` (${company.province})` : ""}` : "—"],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          {company.notes && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500">Note</p>
              <p className="mt-1 text-sm text-gray-700">{company.notes}</p>
            </div>
          )}
        </div>
      )}

      {canEdit && <AziendaActions companyId={company.id} isArchived={company.is_archived} />}
    </div>
  );
}
