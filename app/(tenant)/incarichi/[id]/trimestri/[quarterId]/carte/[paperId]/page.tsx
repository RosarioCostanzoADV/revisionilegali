import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkingPaperEditor } from "./WorkingPaperEditor";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre",
  2: "2° Trimestre",
  3: "3° Trimestre",
  4: "4° Trimestre",
};

const AREA_LABELS: Record<string, string> = {
  cassa_banche: "Cassa e banche",
  crediti_clienti: "Crediti verso clienti",
  debiti_fornitori: "Debiti verso fornitori",
  immobilizzazioni: "Immobilizzazioni",
  rimanenze: "Rimanenze",
  patrimonio_netto: "Patrimonio netto",
  ricavi: "Ricavi",
  costi: "Costi e oneri",
  imposte: "Imposte e tasse",
  adempimenti: "Adempimenti formali",
  altro: "Altro",
};

export default async function WorkingPaperPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string; paperId: string }>;
}) {
  const { id: assignmentId, quarterId, paperId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const [{ data: wp }, { data: quarter }, { data: assignment }] = await Promise.all([
    supabase
      .from("working_papers")
      .select("id, title, area, content, status, prepared_by, reviewed_by, reviewed_at, created_at, updated_at")
      .eq("id", paperId)
      .maybeSingle(),
    supabase
      .from("quarters")
      .select("id, quarter")
      .eq("id", quarterId)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("id, year, company_id")
      .eq("id", assignmentId)
      .maybeSingle(),
  ]);

  if (!wp || !quarter || !assignment) redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}`);

  const { data: company } = assignment.company_id
    ? await supabase.from("companies").select("name").eq("id", assignment.company_id).maybeSingle()
    : { data: null };

  // Nomi preparer e reviewer
  const userIds = [...new Set([wp.prepared_by, wp.reviewed_by].filter(Boolean))];
  const { data: wpUsers } = userIds.length
    ? await supabase.from("user_profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  const userNames: Record<string, string> = Object.fromEntries(
    (wpUsers ?? []).map((u) => [u.id, u.full_name ?? "—"]),
  );

  const isOwnerOrRevisor = ["tenant_owner", "revisor"].includes(profile.role);
  const isPreparer = wp.prepared_by === user.id;
  const canEdit =
    wp.status !== "approvata" &&
    (isPreparer || isOwnerOrRevisor);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <Link href="/incarichi" className="hover:text-brand-600">Incarichi</Link>
          <span>›</span>
          <Link href={`/incarichi/${assignmentId}`} className="hover:text-brand-600">
            {company?.name ?? "—"} — {assignment.year}
          </Link>
          <span>›</span>
          <Link href={`/incarichi/${assignmentId}/trimestri/${quarterId}`} className="hover:text-brand-600">
            {QUARTER_LABELS[quarter.quarter]}
          </Link>
          <span>›</span>
          <span className="text-gray-600 truncate max-w-xs">{wp.title}</span>
        </div>
      </div>

      {/* Metadati */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span><strong className="text-gray-700">Area:</strong> {AREA_LABELS[wp.area] ?? wp.area}</span>
        <span><strong className="text-gray-700">Preparata da:</strong> {userNames[wp.prepared_by] ?? "—"}</span>
        {wp.reviewed_by && (
          <span><strong className="text-gray-700">Approvata da:</strong> {userNames[wp.reviewed_by]}{wp.reviewed_at ? ` · ${new Date(wp.reviewed_at).toLocaleDateString("it-IT")}` : ""}</span>
        )}
        <span><strong className="text-gray-700">Aggiornata:</strong> {new Date(wp.updated_at).toLocaleDateString("it-IT")}</span>
      </div>

      {/* Editor */}
      <WorkingPaperEditor
        paperId={paperId}
        initialTitle={wp.title}
        initialArea={wp.area}
        initialContent={wp.content ?? ""}
        initialStatus={wp.status}
        canEdit={canEdit}
        isOwnerOrRevisor={isOwnerOrRevisor}
        isPreparer={isPreparer}
      />
    </div>
  );
}
