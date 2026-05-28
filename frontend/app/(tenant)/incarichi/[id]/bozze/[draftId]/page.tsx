import { redirect } from "next/navigation";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { DraftEditor } from "./DraftEditor";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  relazione_revisione: "Relazione di revisione",
  lettera_direzione: "Lettera di direzione",
  verbale_collegio: "Verbale del collegio sindacale",
  verbale_sindaco: "Verbale del sindaco unico",
  altro: "Altro documento",
};

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string; draftId: string }>;
}) {
  const { id: assignmentId, draftId } = await params;

  const [me, draft, assignmentSummary] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; title: string; type: string; content?: string; status: string;
      created_by: string; created_by_name?: string; created_at: string; updated_at: string;
      assignment?: { id: string; year: number; company_name?: string };
    }>(`/api/drafts/${draftId}`),
    gwJson<{ id: string; year: number; company_id?: string; company_name?: string }>(`/api/assignments/${assignmentId}`),
  ]);

  if (!me || !["tenant_owner", "revisor"].includes(me.profile.role)) {
    redirect(`/incarichi/${assignmentId}`);
  }
  if (!draft) redirect(`/incarichi/${assignmentId}`);

  const fallbackCompany = !draft.assignment?.company_name && assignmentSummary?.company_id
    ? await gwJson<{ name?: string }>(`/api/companies/${assignmentSummary.company_id}`)
    : null;
  const companyName = draft.assignment?.company_name ?? assignmentSummary?.company_name ?? fallbackCompany?.name ?? "—";
  const assignmentYear = draft.assignment?.year ?? assignmentSummary?.year;

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
          <span className="text-gray-600 truncate max-w-xs">{draft.title}</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span><strong className="text-gray-700">Tipo:</strong> {TYPE_LABELS[draft.type] ?? draft.type}</span>
        <span><strong className="text-gray-700">Creato da:</strong> {draft.created_by_name ?? "—"}</span>
        <span>
          <strong className="text-gray-700">Ultimo aggiornamento:</strong>{" "}
          {new Date(draft.updated_at).toLocaleDateString("it-IT")}
        </span>
      </div>

      <DraftEditor
        draftId={draftId}
        assignmentId={assignmentId}
        initialTitle={draft.title}
        initialContent={draft.content ?? ""}
        initialStatus={draft.status}
        type={draft.type}
      />
    </div>
  );
}
