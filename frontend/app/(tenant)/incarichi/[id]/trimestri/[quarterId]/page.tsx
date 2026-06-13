import { redirect } from "next/navigation";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { AssignmentChecklist } from "../../AssignmentChecklist";
import type { DocItem } from "../../DocumentBrowserModal";
import { ASSIGNMENT_CATEGORIES } from "@/lib/assignment-categories";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};
const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aperto:   { label: "Aperto",   className: "bg-blue-100 text-blue-700" },
  in_corso: { label: "In corso", className: "bg-yellow-100 text-yellow-700" },
  chiuso:   { label: "Chiuso",   className: "bg-gray-100 text-gray-500" },
};
const TYPE_LABELS: Record<string, string> = {
  revisione_legale: "Revisione legale",
  collegio_sindacale: "Collegio sindacale",
  sindaco_unico: "Sindaco unico",
};

export default async function QuarterDetailPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string }>;
}) {
  const { id: assignmentId, quarterId } = await params;

  const [me, quarter, assignment, documents, categoryFlags, previousAssignment] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; quarter: number; status: string; notes?: string;
      closed_at?: string; assignment_id: string;
    }>(`/api/quarters/${quarterId}`),
    gwJson<{
      id: string; year: number; type: string; status: string;
      company_id?: string; company_name?: string;
    }>(`/api/assignments/${assignmentId}`),
    gwJson<{ id: string; name: string; file_path: string; file_size: number | null; mime_type: string | null; category: string; notes: string | null; created_at: string; uploaded_by: string }[]>(
      `/api/documents?quarter_id=${quarterId}`
    ),
    gwJson<{ category_slug: string; is_na: boolean }[]>(`/api/assignments/${assignmentId}/category-flags`),
    gwJson<{ id: string; year: number } | null>(`/api/assignments/${assignmentId}/previous`),
  ]);

  if (!quarter) redirect(`/incarichi/${assignmentId}`);

  const fallbackCompany = !assignment?.company_name && assignment?.company_id
    ? await gwJson<{ name?: string }>(`/api/companies/${assignment.company_id}`)
    : null;
  const assignmentCompanyName = assignment?.company_name ?? fallbackCompany?.name ?? "—";
  const canEdit = me ? ["tenant_owner", "revisor"].includes(me.profile.role) : false;
  const s = STATUS_LABELS[quarter.status] ?? STATUS_LABELS.aperto!;

  // Group quarter docs by ASSIGNMENT_CATEGORIES slugs for the checklist
  const docsByCategory: Record<string, DocItem[]> = {};
  for (const cat of ASSIGNMENT_CATEGORIES) {
    docsByCategory[cat.slug] = [];
  }
  for (const doc of documents ?? []) {
    if (docsByCategory[doc.category] !== undefined) {
      docsByCategory[doc.category]!.push({
        id: doc.id,
        name: doc.name,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        category: doc.category,
        created_at: doc.created_at,
      });
    }
  }
  const naSlugs = (categoryFlags ?? []).filter((f) => f.is_na).map((f) => f.category_slug);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/incarichi" className="hover:text-brand-600">Incarichi</Link>
          <span>›</span>
          <Link href={`/incarichi/${assignmentId}`} className="hover:text-brand-600">
            {assignmentCompanyName} — {assignment?.year}
          </Link>
          <span>›</span>
          <span className="text-gray-600">{QUARTER_LABELS[quarter.quarter]}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{QUARTER_LABELS[quarter.quarter]}</h1>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
        </div>
        {assignment && (
          <p className="mt-1 text-sm text-gray-500">{TYPE_LABELS[assignment.type] ?? assignment.type}</p>
        )}
      </div>

      <AssignmentChecklist
        assignmentId={assignmentId}
        quarterId={quarterId}
        canEdit={canEdit}
        initialDocsByCategory={docsByCategory}
        initialNaSlugs={naSlugs}
        previousAssignmentId={previousAssignment?.id ?? null}
      />

    </div>
  );
}
