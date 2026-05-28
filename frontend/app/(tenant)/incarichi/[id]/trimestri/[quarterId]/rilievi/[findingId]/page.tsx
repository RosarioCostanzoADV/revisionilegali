import { redirect } from "next/navigation";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { FindingEditor } from "./FindingEditor";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};
const SEVERITY_STYLES: Record<string, { label: string; className: string }> = {
  bassa:   { label: "Bassa",   className: "bg-emerald-100 text-emerald-700" },
  media:   { label: "Media",   className: "bg-yellow-100 text-yellow-700" },
  alta:    { label: "Alta",    className: "bg-orange-100 text-orange-700" },
  critica: { label: "Critica", className: "bg-red-100 text-red-700" },
};

export default async function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string; findingId: string }>;
}) {
  const { id: assignmentId, quarterId, findingId } = await params;

  const [me, finding, quarter, quarterPapers, assignmentSummary] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; title: string; description?: string; recommendation?: string;
      severity: string; status: string; response?: string; due_date?: string;
      closed_at?: string; raised_by: string; raised_by_name?: string;
      working_paper_id?: string; working_paper_title?: string;
      created_at: string; updated_at: string;
      quarter?: { id: string; quarter: number; assignment?: { id: string; year: number; company_name?: string } };
    }>(`/api/audit/findings/${findingId}`),
    gwJson<{ id: string; quarter: number }>(`/api/quarters/${quarterId}`),
    gwJson<{ id: string; title: string }[]>(
      `/api/audit/working-papers?quarter_id=${quarterId}`
    ),
    gwJson<{ id: string; year: number; company_id?: string; company_name?: string }>(`/api/assignments/${assignmentId}`),
  ]);

  if (!finding || !quarter) redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}`);

  const isOwnerOrRevisor = me ? ["tenant_owner", "revisor"].includes(me.profile.role) : false;
  const sev = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.media!;
  const fallbackCompany = !finding.quarter?.assignment?.company_name && assignmentSummary?.company_id
    ? await gwJson<{ name?: string }>(`/api/companies/${assignmentSummary.company_id}`)
    : null;
  const companyName = finding.quarter?.assignment?.company_name ?? assignmentSummary?.company_name ?? fallbackCompany?.name ?? "—";
  const assignmentYear = finding.quarter?.assignment?.year ?? assignmentSummary?.year;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <Link href="/incarichi" className="hover:text-brand-600">Incarichi</Link>
          <span>›</span>
          <Link href={`/incarichi/${assignmentId}`} className="hover:text-brand-600">
            {companyName} — {assignmentYear}
          </Link>
          <span>›</span>
          <Link href={`/incarichi/${assignmentId}/trimestri/${quarterId}`} className="hover:text-brand-600">
            {QUARTER_LABELS[quarter.quarter]}
          </Link>
          <span>›</span>
          <span className="text-gray-600 truncate max-w-xs">{finding.title}</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span>
          <strong className="text-gray-700">Gravità:</strong>{" "}
          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${sev.className}`}>{sev.label}</span>
        </span>
        <span><strong className="text-gray-700">Segnalato da:</strong> {finding.raised_by_name ?? "—"}</span>
        {finding.due_date && (
          <span><strong className="text-gray-700">Scadenza:</strong> {new Date(finding.due_date).toLocaleDateString("it-IT")}</span>
        )}
        {finding.working_paper_id && finding.working_paper_title && (
          <span>
            <strong className="text-gray-700">Carta:</strong>{" "}
            <Link href={`/incarichi/${assignmentId}/trimestri/${quarterId}/carte/${finding.working_paper_id}`} className="text-brand-600 hover:underline">
              {finding.working_paper_title}
            </Link>
          </span>
        )}
        {finding.closed_at && (
          <span><strong className="text-gray-700">Chiuso il:</strong> {new Date(finding.closed_at).toLocaleDateString("it-IT")}</span>
        )}
      </div>

      <FindingEditor
        findingId={findingId}
        initialTitle={finding.title}
        initialDescription={finding.description ?? ""}
        initialRecommendation={finding.recommendation ?? ""}
        initialSeverity={finding.severity}
        initialStatus={finding.status}
        initialResponse={finding.response ?? ""}
        initialDueDate={finding.due_date ?? ""}
        initialWorkingPaperId={finding.working_paper_id ?? ""}
        quarterPapers={quarterPapers ?? []}
        isOwnerOrRevisor={isOwnerOrRevisor}
      />
    </div>
  );
}
