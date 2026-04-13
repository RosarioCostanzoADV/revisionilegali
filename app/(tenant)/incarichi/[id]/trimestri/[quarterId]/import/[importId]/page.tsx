import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImportTable } from "./ImportTable";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string; importId: string }>;
}) {
  const { id: assignmentId, quarterId, importId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const [{ data: imp }, { data: quarter }, { data: assignment }] = await Promise.all([
    supabase
      .from("accounting_imports")
      .select("id, filename, period_label, row_count, notes, created_at, uploaded_by")
      .eq("id", importId)
      .maybeSingle(),
    supabase.from("quarters").select("id, quarter").eq("id", quarterId).maybeSingle(),
    supabase.from("assignments").select("id, year, company_id").eq("id", assignmentId).maybeSingle(),
  ]);

  if (!imp || !quarter || !assignment) redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}`);

  const { data: entries } = await supabase
    .from("accounting_entries")
    .select("id, account_code, account_name, balance, balance_prev")
    .eq("import_id", importId)
    .order("account_code", { nullsFirst: false })
    .order("account_name");

  const { data: company } = assignment.company_id
    ? await supabase.from("companies").select("name").eq("id", assignment.company_id).maybeSingle()
    : { data: null };

  const { data: uploader } = await supabase
    .from("user_profiles").select("full_name").eq("id", imp.uploaded_by).maybeSingle();

  const canEdit = ["tenant_owner", "revisor"].includes(profile.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
          <span className="text-gray-600">Import — {imp.period_label}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Bilancio di verifica — {imp.period_label}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
          <span>{imp.filename}</span>
          <span>{imp.row_count} conti importati</span>
          <span>Caricato da {uploader?.full_name ?? "—"} il {new Date(imp.created_at).toLocaleDateString("it-IT")}</span>
          {imp.notes && <span className="italic">{imp.notes}</span>}
        </div>
      </div>

      <ImportTable
        entries={entries ?? []}
        importId={importId}
        assignmentId={assignmentId}
        quarterId={quarterId}
        canDelete={canEdit}
      />
    </div>
  );
}
