import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DraftEditor } from "./DraftEditor";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  if (!["tenant_owner", "revisor"].includes(profile.role)) {
    redirect(`/incarichi/${assignmentId}`);
  }

  const [{ data: draft }, { data: assignment }] = await Promise.all([
    supabase
      .from("drafts")
      .select("id, title, type, content, status, created_by, created_at, updated_at")
      .eq("id", draftId)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("id, year, company_id")
      .eq("id", assignmentId)
      .maybeSingle(),
  ]);

  if (!draft || !assignment) redirect(`/incarichi/${assignmentId}`);

  const { data: company } = assignment.company_id
    ? await supabase.from("companies").select("name").eq("id", assignment.company_id).maybeSingle()
    : { data: null };

  const { data: creator } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", draft.created_by)
    .maybeSingle();

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
          <span className="text-gray-600 truncate max-w-xs">{draft.title}</span>
        </div>
      </div>

      {/* Metadati */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span><strong className="text-gray-700">Tipo:</strong> {TYPE_LABELS[draft.type] ?? draft.type}</span>
        <span><strong className="text-gray-700">Creato da:</strong> {creator?.full_name ?? "—"}</span>
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
