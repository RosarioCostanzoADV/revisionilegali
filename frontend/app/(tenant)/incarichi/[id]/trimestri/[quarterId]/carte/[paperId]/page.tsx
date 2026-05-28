import { redirect } from "next/navigation";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { WorkingPaperEditor } from "./WorkingPaperEditor";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};
const AREA_LABELS: Record<string, string> = {
  cassa_banche: "Cassa e banche", crediti_clienti: "Crediti verso clienti",
  debiti_fornitori: "Debiti verso fornitori", immobilizzazioni: "Immobilizzazioni",
  rimanenze: "Rimanenze", patrimonio_netto: "Patrimonio netto",
  ricavi: "Ricavi", costi: "Costi e oneri", imposte: "Imposte e tasse",
  adempimenti: "Adempimenti formali", altro: "Altro",
};

export default async function WorkingPaperPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string; paperId: string }>;
}) {
  const { id: assignmentId, quarterId, paperId } = await params;

  const [me, wp, quarter, assignmentSummary] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; title: string; area: string; content?: string; status: string;
      prepared_by: string; prepared_by_name?: string;
      reviewed_by?: string; reviewed_by_name?: string; reviewed_at?: string;
      created_at: string; updated_at: string;
      quarter?: { id: string; quarter: number; assignment?: { id: string; year: number; company_name?: string } };
    }>(`/api/audit/working-papers/${paperId}`),
    gwJson<{ id: string; quarter: number }>(`/api/quarters/${quarterId}`),
    gwJson<{ id: string; year: number; company_id?: string; company_name?: string }>(`/api/assignments/${assignmentId}`),
  ]);

  if (!wp || !quarter) redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}`);

  const isOwnerOrRevisor = me ? ["tenant_owner", "revisor"].includes(me.profile.role) : false;
  const canEdit = wp.status !== "approvata" && isOwnerOrRevisor;
  const fallbackCompany = !wp.quarter?.assignment?.company_name && assignmentSummary?.company_id
    ? await gwJson<{ name?: string }>(`/api/companies/${assignmentSummary.company_id}`)
    : null;
  const companyName = wp.quarter?.assignment?.company_name ?? assignmentSummary?.company_name ?? fallbackCompany?.name ?? "—";
  const assignmentYear = wp.quarter?.assignment?.year ?? assignmentSummary?.year;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
          <span className="text-gray-600 truncate max-w-xs">{wp.title}</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span><strong className="text-gray-700">Area:</strong> {AREA_LABELS[wp.area] ?? wp.area}</span>
        <span><strong className="text-gray-700">Preparata da:</strong> {wp.prepared_by_name ?? "—"}</span>
        {wp.reviewed_by && (
          <span><strong className="text-gray-700">Approvata da:</strong> {wp.reviewed_by_name}{wp.reviewed_at ? ` · ${new Date(wp.reviewed_at).toLocaleDateString("it-IT")}` : ""}</span>
        )}
        <span><strong className="text-gray-700">Aggiornata:</strong> {new Date(wp.updated_at).toLocaleDateString("it-IT")}</span>
      </div>

      <WorkingPaperEditor
        paperId={paperId}
        initialTitle={wp.title}
        initialArea={wp.area}
        initialContent={wp.content ?? ""}
        initialStatus={wp.status}
        canEdit={canEdit}
        isOwnerOrRevisor={isOwnerOrRevisor}
        isPreparer={false}
      />
    </div>
  );
}
