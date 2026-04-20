import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";

export default async function NuovoImportPage({
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
  if (!["tenant_owner", "revisor"].includes(profile.role)) {
    redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}`);
  }

  const [{ data: quarter }, { data: assignment }] = await Promise.all([
    supabase.from("quarters").select("id, quarter").eq("id", quarterId).maybeSingle(),
    supabase.from("assignments").select("id, year, company_id").eq("id", assignmentId).maybeSingle(),
  ]);

  if (!quarter || !assignment) redirect(`/incarichi/${assignmentId}`);

  const { data: company } = assignment.company_id
    ? await supabase.from("companies").select("name").eq("id", assignment.company_id).maybeSingle()
    : { data: null };

  const QUARTER_LABELS: Record<number, string> = {
    1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
          <span className="text-gray-600">Nuovo import</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Importa documento contabile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Carica il file, verifica i dati estratti e conferma prima del salvataggio.
        </p>
      </div>

      <ImportWizard
        quarterId={quarterId}
        assignmentId={assignmentId}
      />
    </div>
  );
}
