import Link from "next/link";
import { notFound } from "next/navigation";
import { gwJson } from "@/lib/api";
import { ModificaIncaricoForm } from "./ModificaIncaricoForm";
import { BozzeSection } from "./BozzeSection";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  revisione_legale: "Revisione legale",
  collegio_sindacale: "Collegio sindacale",
  sindaco_unico: "Sindaco unico",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aperto:   { label: "Aperto",   className: "bg-blue-100 text-blue-700" },
  in_corso: { label: "In corso", className: "bg-yellow-100 text-yellow-700" },
  chiuso:   { label: "Chiuso",   className: "bg-gray-100 text-gray-500" },
};

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor: "Revisore",
  collaborator: "Collaboratore",
  syndic: "Sindaco",
};

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};

export default async function IncaricoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [me, assignment, quarters, drafts, allUsers] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; year: number; type: string; status: string; notes?: string;
      company_id?: string; company_name?: string; company_fiscal_code?: string;
      company_city?: string; member_ids?: string[];
      members?: { id: string; full_name: string; role: string }[];
    }>(`/api/assignments/${id}`),
    gwJson<{ id: string; quarter: number; status: string }[]>(
      `/api/assignments/${id}/quarters`
    ),
    gwJson<{ id: string; title: string; type: string; status: string; updated_at: string }[]>(
      `/api/drafts?assignment_id=${id}`
    ),
    gwJson<{ id: string; full_name: string; role: string }[]>("/api/auth/users"),
  ]);

  if (!assignment) notFound();

  const fallbackCompany = !assignment.company_name && assignment.company_id
    ? await gwJson<{ name?: string }>(`/api/companies/${assignment.company_id}`)
    : null;
  const assignmentCompanyName = assignment.company_name ?? fallbackCompany?.name ?? "—";

  const canEdit = me ? ["tenant_owner", "revisor"].includes(me.profile.role) : false;
  const s = STATUS_LABELS[assignment.status] ?? STATUS_LABELS.aperto!;
  const memberIds = assignment.member_ids ?? (assignment.members ?? []).map((m) => m.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/incarichi" className="text-sm text-brand-600 hover:text-brand-700">← Tutti gli incarichi</Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {assignmentCompanyName} — {assignment.year}
          </h1>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{TYPE_LABELS[assignment.type] ?? assignment.type}</p>
      </div>

      {/* Trimestri */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Trimestri</h2>
        {!(quarters ?? []).length ? (
          <p className="text-sm text-gray-400">Nessun trimestre disponibile.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(quarters ?? []).map((q) => {
              const qs = STATUS_LABELS[q.status] ?? STATUS_LABELS.aperto!;
              return (
                <Link
                  key={q.id}
                  href={`/incarichi/${id}/trimestri/${q.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-900">{QUARTER_LABELS[q.quarter]}</span>
                  <span className={`inline-flex self-start rounded-full px-2 py-0.5 text-xs font-medium ${qs.className}`}>{qs.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Dettagli */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Dettagli</h2>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-500">Azienda</dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {assignment.company_id ? (
                <Link href={`/aziende/${assignment.company_id}`} className="text-brand-600 hover:text-brand-700">
                  {assignmentCompanyName}
                </Link>
              ) : "—"}
            </dd>
          </div>
          {assignment.company_fiscal_code && (
            <div><dt className="text-gray-500">Codice fiscale</dt><dd className="mt-0.5 font-medium text-gray-900">{assignment.company_fiscal_code}</dd></div>
          )}
          {assignment.company_city && (
            <div><dt className="text-gray-500">Città</dt><dd className="mt-0.5 font-medium text-gray-900">{assignment.company_city}</dd></div>
          )}
          <div><dt className="text-gray-500">Anno</dt><dd className="mt-0.5 font-medium text-gray-900">{assignment.year}</dd></div>
          <div><dt className="text-gray-500">Tipo</dt><dd className="mt-0.5 font-medium text-gray-900">{TYPE_LABELS[assignment.type] ?? assignment.type}</dd></div>
        </dl>
        {assignment.notes && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Note</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.notes}</p>
          </div>
        )}
      </div>

      {/* Team */}
      {(assignment.members ?? []).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Team assegnato</h2>
          <ul className="space-y-2">
            {(assignment.members ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
                  {(p.full_name ?? "?")[0]?.toUpperCase()}
                </span>
                <span className="font-medium text-gray-900">{p.full_name ?? "—"}</span>
                <span className="text-gray-400">{ROLE_LABELS[p.role] ?? p.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BozzeSection assignmentId={id} initialDrafts={drafts ?? []} canCreate={canEdit} />

      {canEdit && (
        <ModificaIncaricoForm
          assignmentId={id}
          currentStatus={assignment.status}
          currentMemberIds={memberIds}
          allUsers={allUsers ?? []}
          notes={assignment.notes ?? null}
        />
      )}
    </div>
  );
}
