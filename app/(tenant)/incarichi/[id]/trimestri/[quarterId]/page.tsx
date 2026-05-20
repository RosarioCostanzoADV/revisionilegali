import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuarterStatusForm } from "./QuarterStatusForm";
import { DocumentiSection } from "./DocumentiSection";
import { CarteSection } from "./CarteSection";
import { RilieviSection } from "./RilieviSection";
import { VigilanzaSection } from "./VigilanzaSection";
import { ImportSection } from "./ImportSection";
import { VerbaliSection } from "./VerbaliSection";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre",
  2: "2° Trimestre",
  3: "3° Trimestre",
  4: "4° Trimestre",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aperto: { label: "Aperto", className: "bg-blue-100 text-blue-700" },
  in_corso: { label: "In corso", className: "bg-yellow-100 text-yellow-700" },
  chiuso: { label: "Chiuso", className: "bg-gray-100 text-gray-500" },
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const [
    { data: quarter },
    { data: assignment },
    { data: documents },
    { data: papers },
    { data: findings },
    { data: vigilanzaItems },
    { data: accountingImports },
    { data: quarterDrafts },
  ] = await Promise.all([
    supabase
      .from("quarters")
      .select("id, quarter, status, notes, closed_at, assignment_id")
      .eq("id", quarterId)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("id, year, type, company_id")
      .eq("id", assignmentId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, name, file_path, file_size, mime_type, category, notes, created_at, uploaded_by")
      .eq("quarter_id", quarterId)
      .order("created_at", { ascending: false }),
    supabase
      .from("working_papers")
      .select("id, title, area, status, prepared_by, created_at")
      .eq("quarter_id", quarterId)
      .order("created_at", { ascending: true }),
    supabase
      .from("findings")
      .select("id, title, severity, status, raised_by, due_date, created_at")
      .eq("quarter_id", quarterId)
      .order("created_at", { ascending: true }),
    supabase
      .from("vigilanza_items")
      .select("id, item, category, done, notes, completed_by, completed_at, sort_order")
      .eq("quarter_id", quarterId)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("accounting_imports")
      .select("id, filename, period_label, row_count, doc_type, created_at, uploaded_by")
      .eq("quarter_id", quarterId)
      .order("created_at", { ascending: false }),
    supabase
      .from("drafts")
      .select("id, title, type, status, created_at")
      .eq("quarter_id", quarterId)
      .order("created_at", { ascending: false }),
  ]);

  if (!quarter || !assignment) redirect(`/incarichi/${assignmentId}`);

  const { data: company } = assignment.company_id
    ? await supabase.from("companies").select("id, name").eq("id", assignment.company_id).maybeSingle()
    : { data: null };

  // Nomi uploader documenti
  const uploaderIds = [...new Set((documents ?? []).map((d) => d.uploaded_by))];
  // Nomi preparer carte
  const preparerIds = [...new Set((papers ?? []).map((p) => p.prepared_by))];
  const vigilanzaCompletedIds = [...new Set((vigilanzaItems ?? []).map((v) => v.completed_by).filter(Boolean))];
  const raisedByIds = [...new Set((findings ?? []).map((f) => f.raised_by))];
  const allUserIds = [...new Set([...uploaderIds, ...preparerIds, ...raisedByIds, ...vigilanzaCompletedIds])];

  const { data: userProfiles } = allUserIds.length
    ? await supabase.from("user_profiles").select("id, full_name").in("id", allUserIds)
    : { data: [] };

  const userNames: Record<string, string> = Object.fromEntries(
    (userProfiles ?? []).map((p) => [p.id, p.full_name ?? "—"]),
  );

  const canEdit = ["tenant_owner", "revisor"].includes(profile.role);
  const s = STATUS_LABELS[quarter.status] ?? STATUS_LABELS.aperto!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/incarichi" className="hover:text-brand-600">Incarichi</Link>
          <span>›</span>
          <Link href={`/incarichi/${assignmentId}`} className="hover:text-brand-600">
            {company?.name ?? "—"} — {assignment.year}
          </Link>
          <span>›</span>
          <span className="text-gray-600">{QUARTER_LABELS[quarter.quarter]}</span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {QUARTER_LABELS[quarter.quarter]}
          </h1>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
            {s.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {company?.name} · {assignment.year} · {TYPE_LABELS[assignment.type] ?? assignment.type}
        </p>
      </div>

      {/* Stato e note */}
      {canEdit && (
        <QuarterStatusForm
          quarterId={quarterId}
          currentStatus={quarter.status}
          currentNotes={quarter.notes ?? ""}
        />
      )}
      {!canEdit && quarter.notes && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Note</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{quarter.notes}</p>
        </div>
      )}

      {/* Import — prima azione operativa */}
      <ImportSection
        quarterId={quarterId}
        assignmentId={assignmentId}
        initialImports={accountingImports ?? []}
        uploaderNames={userNames}
        canUpload={canEdit}
      />

      {/* Documenti — raccolta documentazione di supporto */}
      <DocumentiSection
        quarterId={quarterId}
        initialDocuments={documents ?? []}
        uploaderNames={userNames}
        canUpload={true}
        currentUserId={user.id}
        isOwnerOrRevisor={canEdit}
      />

      {/* Carte di lavoro — analisi per area, alimentata da import e documenti */}
      <CarteSection
        quarterId={quarterId}
        assignmentId={assignmentId}
        initialPapers={papers ?? []}
        preparerNames={userNames}
        currentUserId={user.id}
        canEdit={canEdit}
      />

      {/* Rilievi — emergono durante il lavoro sulle carte */}
      <RilieviSection
        quarterId={quarterId}
        assignmentId={assignmentId}
        initialFindings={findings ?? []}
        raisedByNames={userNames}
      />

      {/* Verbali trimestrali */}
      <VerbaliSection
        quarterId={quarterId}
        assignmentId={assignmentId}
        quarterLabel={`${QUARTER_LABELS[quarter.quarter]} ${assignment.year}`}
        initialDrafts={quarterDrafts ?? []}
        canCreate={canEdit}
      />

      {/* Vigilanza — adempimenti periodici del collegio */}
      <VigilanzaSection
        quarterId={quarterId}
        initialItems={vigilanzaItems ?? []}
        completedByNames={userNames}
      />

      {/* Data chiusura formale */}
      {quarter.status === "chiuso" && quarter.closed_at && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          Trimestre chiuso il{" "}
          {new Date(quarter.closed_at).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </div>
      )}
    </div>
  );
}
