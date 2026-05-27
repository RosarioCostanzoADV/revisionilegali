import { redirect } from "next/navigation";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { QuarterStatusForm } from "./QuarterStatusForm";
import { DocumentiSection } from "./DocumentiSection";
import { CarteSection } from "./CarteSection";
import { RilieviSection } from "./RilieviSection";
import { VigilanzaSection } from "./VigilanzaSection";
import { ImportSection } from "./ImportSection";
import { VerbaliSection } from "./VerbaliSection";
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

  const [me, quarter, documents, papers, findings, vigilanzaItems, accountingImports, quarterDrafts] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; quarter: number; status: string; notes?: string;
      closed_at?: string; assignment_id: string;
      assignment?: { id: string; year: number; type: string; company_id?: string; company_name?: string };
    }>(`/api/quarters/${quarterId}`),
    gwJson<{ id: string; name: string; file_path: string; file_size: number | null; mime_type: string | null; category: string; notes: string | null; created_at: string; uploaded_by: string }[]>(
      `/api/documents?quarter_id=${quarterId}`
    ),
    gwJson<{ id: string; title: string; area: string; status: string; prepared_by: string; prepared_by_name?: string; created_at: string }[]>(
      `/api/audit/working-papers?quarter_id=${quarterId}`
    ),
    gwJson<{ id: string; title: string; severity: string; status: string; raised_by: string; due_date: string | null; created_at: string }[]>(
      `/api/audit/findings?quarter_id=${quarterId}`
    ),
    gwJson<{ id: string; item: string; category: string; done: boolean; notes: string | null; completed_by: string | null; completed_at: string | null; sort_order: number }[]>(
      `/api/audit/vigilanza?quarter_id=${quarterId}`
    ),
    gwJson<{ id: string; filename: string; period_label: string; row_count: number | null; doc_type: string; created_at: string }[]>(
      `/api/accounting/imports?quarter_id=${quarterId}`
    ),
    gwJson<{ id: string; title: string; type: string; status: string; created_at: string }[]>(
      `/api/drafts?quarter_id=${quarterId}`
    ),
  ]);

  if (!quarter) redirect(`/incarichi/${assignmentId}`);

  const assignment = quarter.assignment;
  const canEdit = me ? ["tenant_owner", "revisor"].includes(me.profile.role) : false;
  const s = STATUS_LABELS[quarter.status] ?? STATUS_LABELS.aperto!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/incarichi" className="hover:text-brand-600">Incarichi</Link>
          <span>›</span>
          <Link href={`/incarichi/${assignmentId}`} className="hover:text-brand-600">
            {assignment?.company_name ?? "—"} — {assignment?.year}
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

      <QuarterStatusForm
        quarterId={quarterId}
        currentStatus={quarter.status}
        currentNotes={quarter.notes ?? ''}
        canEdit={canEdit}
      />

      <DocumentiSection
        quarterId={quarterId}
        initialDocuments={documents ?? []}
        uploaderNames={{}}
        canUpload={canEdit}
        currentUserId={me?.user.id ?? ""}
        isOwnerOrRevisor={canEdit}
      />

      <CarteSection
        quarterId={quarterId}
        assignmentId={assignmentId}
        initialPapers={papers ?? []}
        preparerNames={{}}
        currentUserId={me?.user.id ?? ""}
        canEdit={canEdit}
      />

      <RilieviSection
        quarterId={quarterId}
        assignmentId={assignmentId}
        initialFindings={findings ?? []}
        raisedByNames={{}}
      />

      <VigilanzaSection
        quarterId={quarterId}
        initialItems={vigilanzaItems ?? []}
        completedByNames={{}}
      />

      <ImportSection
        quarterId={quarterId}
        assignmentId={assignmentId}
        initialImports={accountingImports ?? []}
        uploaderNames={{}}
        canUpload={canEdit}
      />

      <VerbaliSection
        quarterId={quarterId}
        assignmentId={assignmentId}
        quarterLabel={QUARTER_LABELS[quarter.quarter] ?? ""}
        initialDrafts={quarterDrafts ?? []}
        canCreate={canEdit}
      />
    </div>
  );
}
