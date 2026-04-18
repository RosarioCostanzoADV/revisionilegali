import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FindingEditor } from "./FindingEditor";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};

const SEVERITY_STYLES: Record<string, { label: string; className: string }> = {
  bassa: { label: "Bassa", className: "bg-emerald-100 text-emerald-700" },
  media: { label: "Media", className: "bg-yellow-100 text-yellow-700" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-700" },
  critica: { label: "Critica", className: "bg-red-100 text-red-700" },
};

export default async function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string; findingId: string }>;
}) {
  const { id: assignmentId, quarterId, findingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const [{ data: finding }, { data: quarter }, { data: assignment }] = await Promise.all([
    supabase
      .from("findings")
      .select("id, title, description, recommendation, severity, status, response, due_date, closed_at, raised_by, working_paper_id, created_at, updated_at")
      .eq("id", findingId)
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

  if (!finding || !quarter || !assignment) redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}`);

  const { data: company } = assignment.company_id
    ? await supabase.from("companies").select("name").eq("id", assignment.company_id).maybeSingle()
    : { data: null };

  const { data: raiser } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", finding.raised_by)
    .maybeSingle();

  // Working paper collegata (opzionale)
  const { data: wp } = finding.working_paper_id
    ? await supabase.from("working_papers").select("id, title").eq("id", finding.working_paper_id).maybeSingle()
    : { data: null };

  // Lista carte del trimestre (per collegamento)
  const { data: quarterPapers } = await supabase
    .from("working_papers")
    .select("id, title")
    .eq("quarter_id", quarterId)
    .order("created_at");

  const isOwnerOrRevisor = ["tenant_owner", "revisor"].includes(profile.role);
  const sev = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.media!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
          <span className="text-gray-600 truncate max-w-xs">{finding.title}</span>
        </div>
      </div>

      {/* Metadati */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span>
          <strong className="text-gray-700">Severità:</strong>{" "}
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sev.className}`}>
            {sev.label}
          </span>
        </span>
        <span><strong className="text-gray-700">Rilevato da:</strong> {raiser?.full_name ?? "—"}</span>
        {finding.due_date && (
          <span>
            <strong className="text-gray-700">Scadenza:</strong>{" "}
            {new Date(finding.due_date).toLocaleDateString("it-IT")}
          </span>
        )}
        {wp && (
          <span>
            <strong className="text-gray-700">Carta:</strong>{" "}
            <Link
              href={`/incarichi/${assignmentId}/trimestri/${quarterId}/carte/${wp.id}`}
              className="text-brand-600 hover:underline"
            >
              {wp.title}
            </Link>
          </span>
        )}
        {finding.closed_at && (
          <span>
            <strong className="text-gray-700">Chiuso il:</strong>{" "}
            {new Date(finding.closed_at).toLocaleDateString("it-IT")}
          </span>
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
