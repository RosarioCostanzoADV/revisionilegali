import { redirect } from "next/navigation";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { ImportWizard } from "./ImportWizard";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};

export default async function NuovoImportPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string }>;
}) {
  const { id: assignmentId, quarterId } = await params;

  const [me, quarter, assignmentSummary] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; quarter: number;
      assignment?: { id: string; year: number; company_name?: string };
    }>(`/api/quarters/${quarterId}`),
    gwJson<{ id: string; year: number; company_id?: string; company_name?: string }>(`/api/assignments/${assignmentId}`),
  ]);

  if (!me || !["tenant_owner", "revisor"].includes(me.profile.role)) {
    redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}`);
  }
  if (!quarter) redirect(`/incarichi/${assignmentId}`);

  const fallbackCompany = !quarter.assignment?.company_name && assignmentSummary?.company_id
    ? await gwJson<{ name?: string }>(`/api/companies/${assignmentSummary.company_id}`)
    : null;
  const companyName = quarter.assignment?.company_name ?? assignmentSummary?.company_name ?? fallbackCompany?.name ?? "—";
  const year = quarter.assignment?.year ?? assignmentSummary?.year;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <Link href="/incarichi" className="hover:text-brand-600">Incarichi</Link>
          <span>›</span>
          <Link href={`/incarichi/${assignmentId}`} className="hover:text-brand-600">
            {companyName} — {year}
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

      <ImportWizard quarterId={quarterId} assignmentId={assignmentId} />
    </div>
  );
}
