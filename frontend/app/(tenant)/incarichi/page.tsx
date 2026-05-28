import Link from "next/link";
import { gwJson } from "@/lib/api";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  revisione_legale:   "Revisione legale",
  collegio_sindacale: "Collegio sindacale",
  sindaco_unico:      "Sindaco unico",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aperto:   { label: "Aperto",   className: "bg-blue-100 text-blue-700" },
  in_corso: { label: "In corso", className: "bg-yellow-100 text-yellow-700" },
  chiuso:   { label: "Chiuso",   className: "bg-gray-100 text-gray-500" },
};

export default async function IncarichiPage() {
  const [me, assignments] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{ id: string; company_id?: string; year: number; type: string; status: string; company_name?: string }[]>("/api/assignments"),
  ]);

  if (!me) return null;

  const canCreate = ["tenant_owner", "revisor"].includes(me.profile.role);
  const shouldResolveCompanies = (assignments ?? []).some((a) => !a.company_name && !!a.company_id);
  const companies = shouldResolveCompanies
    ? await gwJson<{ id: string; name: string }[]>("/api/companies")
    : [];
  const companyNameById = Object.fromEntries((companies ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incarichi</h1>
          <p className="mt-1 text-sm text-gray-500">{assignments?.length ?? 0} incarichi totali</p>
        </div>
        {canCreate && (
          <Link
            href="/incarichi/nuovo"
            className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuovo incarico
          </Link>
        )}
      </div>

      {!assignments?.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Nessun incarico ancora. Creane uno.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Azienda", "Anno", "Tipo", "Stato", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((a) => {
                const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.aperto!;
                const companyName = a.company_name ?? (a.company_id ? companyNameById[a.company_id] : undefined) ?? "—";
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{companyName}</td>
                    <td className="px-4 py-3 text-gray-700">{a.year}</td>
                    <td className="px-4 py-3 text-gray-700">{TYPE_LABELS[a.type] ?? a.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/incarichi/${a.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
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
