import Link from "next/link";
import { notFound } from "next/navigation";
import { gwJson } from "@/lib/api";
import { AssignmentDocumentRepository, type RepoDoc } from "./AssignmentDocumentRepository";
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

const QUARTER_STATUS: Record<string, string> = {
  aperto: "bg-blue-100 text-blue-700",
  in_corso: "bg-yellow-100 text-yellow-700",
  chiuso: "bg-gray-100 text-gray-500",
};

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trim.", 2: "2° Trim.", 3: "3° Trim.", 4: "4° Trim.",
};

type QuarterDoc = {
  id: string; name: string; file_size: number | null;
  mime_type: string | null; category: string; created_at: string;
};

export default async function IncaricoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [me, assignment, quarters] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; year: number; type: string; status: string; notes?: string;
      company_id?: string; company_name?: string; company_fiscal_code?: string;
      members?: { id: string; full_name: string; role: string }[];
    }>(`/api/assignments/${id}`),
    gwJson<{ id: string; quarter: number; status: string }[]>(`/api/assignments/${id}/quarters`),
  ]);

  if (!assignment) notFound();

  const fallbackCompany = !assignment.company_name && assignment.company_id
    ? await gwJson<{ name?: string }>(`/api/companies/${assignment.company_id}`)
    : null;
  const companyName = assignment.company_name ?? fallbackCompany?.name ?? "—";

  // Fetch all documents from all quarters in parallel
  const allQuarterDocsArrays = (quarters ?? []).length > 0
    ? await Promise.all(
        (quarters ?? []).map((q) =>
          gwJson<QuarterDoc[]>(`/api/documents?quarter_id=${q.id}`)
        )
      )
    : [];

  const repoDocsByCategory: Record<string, RepoDoc[]> = {};
  for (let i = 0; i < (quarters ?? []).length; i++) {
    const q = (quarters ?? [])[i];
    if (!q) continue;
    for (const doc of allQuarterDocsArrays[i] ?? []) {
      const slug = doc.category;
      if (!repoDocsByCategory[slug]) repoDocsByCategory[slug] = [];
      repoDocsByCategory[slug].push({
        id: doc.id,
        name: doc.name,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        category: slug,
        created_at: doc.created_at,
        quarter_number: q.quarter,
      });
    }
  }

  const s = STATUS_LABELS[assignment.status] ?? STATUS_LABELS.aperto!;

  return (
    <div className="mx-auto max-w-5xl space-y-5">

      {/* Breadcrumb */}
      <Link href="/incarichi" className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Tutti gli incarichi
      </Link>

      {/* Assignment header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {assignment.company_id ? (
                  <Link href={`/aziende/${assignment.company_id}`} className="hover:text-brand-600 transition-colors">
                    {companyName}
                  </Link>
                ) : companyName}
                {" — "}{assignment.year}
              </h1>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
                {s.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{TYPE_LABELS[assignment.type] ?? assignment.type}</p>
            {assignment.notes && (
              <p className="mt-2 text-xs text-gray-400 whitespace-pre-wrap">{assignment.notes}</p>
            )}
          </div>

          {/* Team chips */}
          {(assignment.members ?? []).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(assignment.members ?? []).map((m) => (
                <span
                  key={m.id}
                  title={m.full_name}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700"
                >
                  {(m.full_name ?? "?")[0]?.toUpperCase()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quarters nav */}
        {(quarters ?? []).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Trimestri</p>
            <div className="flex flex-wrap gap-2">
              {(quarters ?? []).map((q) => (
                <Link
                  key={q.id}
                  href={`/incarichi/${id}/trimestri/${q.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {QUARTER_LABELS[q.quarter] ?? `T${q.quarter}`}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${QUARTER_STATUS[q.status] ?? QUARTER_STATUS.aperto}`}>
                    {q.status === "aperto" ? "Aperto" : q.status === "in_corso" ? "In corso" : "Chiuso"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <AssignmentDocumentRepository docsByCategory={repoDocsByCategory} />
    </div>
  );
}
