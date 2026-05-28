import { redirect } from "next/navigation";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { ImportTable } from "./ImportTable";
import { AnalisiRischio, type AreaSummary } from "./AnalisiRischio";
import { AnalisiDocumento } from "./AnalisiDocumento";
import { classifyAccount, getAreaLabel } from "@/lib/audit/classification";

export const dynamic = "force-dynamic";

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};

const DOC_TYPE_TITLES: Record<string, string> = {
  bilancio_verifica: "Bilancio di verifica",
  estratto_conto:    "Estratto conto bancario",
  rimanenze:         "Dettaglio rimanenze",
  registro_iva:      "Registro IVA",
  libro_giornale:    "Libro giornale",
  altro:             "Documento",
};

interface Entry {
  id: string;
  account_code: string | null;
  account_name: string;
  balance: number;
  balance_prev: number | null;
}

function computeAreaAnalysis(entries: Entry[]): { areas: AreaSummary[]; hasPrev: boolean } {
  const hasPrev = entries.some((e) => e.balance_prev !== null);

  // Raggruppa per area
  const groups: Record<string, Entry[]> = {};
  for (const entry of entries) {
    const key = classifyAccount(entry.account_name);
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(entry);
  }

  const areas: AreaSummary[] = [];

  for (const [key, accs] of Object.entries(groups)) {
    const balance = accs.reduce((s, e) => s + e.balance, 0);
    const balancePrev = accs.reduce((s, e) => s + (e.balance_prev ?? 0), 0);

    let variationPct: number | null = null;
    if (hasPrev && balancePrev !== 0) {
      variationPct = ((balance - balancePrev) / Math.abs(balancePrev)) * 100;
    }

    const accountsWithPct = accs.map((e) => ({
      ...e,
      variationPct:
        e.balance_prev && e.balance_prev !== 0
          ? ((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100
          : null,
    }));

    const significantCount = accountsWithPct.filter(
      (e) => e.variationPct !== null && Math.abs(e.variationPct) >= 15,
    ).length;

    const criticalCount = accountsWithPct.filter(
      (e) => e.variationPct !== null && Math.abs(e.variationPct) >= 30,
    ).length;

    let riskLevel: AreaSummary["riskLevel"];
    if (!hasPrev) {
      riskLevel = "unknown";
    } else if (
      criticalCount > 0 ||
      (variationPct !== null && Math.abs(variationPct) >= 20) ||
      significantCount >= 3
    ) {
      riskLevel = "high";
    } else if (
      significantCount >= 1 ||
      (variationPct !== null && Math.abs(variationPct) >= 10)
    ) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }

    // Top 5 conti per variazione assoluta
    const topAccounts = [...accountsWithPct]
      .sort((a, b) => {
        const absA = a.variationPct !== null ? Math.abs(a.variationPct) : 0;
        const absB = b.variationPct !== null ? Math.abs(b.variationPct) : 0;
        return absB - absA;
      })
      .slice(0, 5)
      .map((e) => ({
        account_code: e.account_code,
        account_name: e.account_name,
        balance: e.balance,
        balance_prev: e.balance_prev,
        variationPct: e.variationPct,
      }));

    areas.push({
      key,
      label: getAreaLabel(key),
      riskLevel,
      accountCount: accs.length,
      balance,
      balancePrev,
      variationPct,
      significantCount,
      criticalCount,
      topAccounts,
    });
  }

  // Ordine: high → medium → low → unknown
  const order: Record<string, number> = { high: 0, medium: 1, low: 2, unknown: 3 };
  areas.sort((a, b) => (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3));

  return { areas, hasPrev };
}

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string; importId: string }>;
}) {
  const { id: assignmentId, quarterId, importId } = await params;

  const [imp, quarter, entries, assignmentSummary] = await Promise.all([
    gwJson<{
      id: string; filename: string; period_label?: string; row_count?: number;
      notes?: string; doc_type?: string; created_at: string;
      uploaded_by: string; uploaded_by_name?: string;
      quarter?: { id: string; quarter: number; assignment?: { id: string; year: number; company_name?: string } };
    }>(`/api/accounting/imports/${importId}`),
    gwJson<{ id: string; quarter: number }>(`/api/quarters/${quarterId}`),
    gwJson<Entry[]>(`/api/accounting/imports/${importId}/analisi`),
    gwJson<{ id: string; year: number; company_id?: string; company_name?: string }>(`/api/assignments/${assignmentId}`),
  ]);

  if (!imp || !quarter) redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}`);

  const fallbackCompany = !imp.quarter?.assignment?.company_name && assignmentSummary?.company_id
    ? await gwJson<{ name?: string }>(`/api/companies/${assignmentSummary.company_id}`)
    : null;
  const companyName = imp.quarter?.assignment?.company_name ?? assignmentSummary?.company_name ?? fallbackCompany?.name ?? "—";
  const assignmentYear = imp.quarter?.assignment?.year ?? assignmentSummary?.year;

  const { areas, hasPrev } = computeAreaAnalysis(entries ?? []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Breadcrumb */}
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
          <span className="text-gray-600">Import — {imp.period_label}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          {DOC_TYPE_TITLES[imp.doc_type ?? "bilancio_verifica"] ?? "Documento"} — {imp.period_label}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
          <span>{imp.filename}</span>
          <span>{imp.row_count} conti importati</span>
          <span>Caricato da {imp.uploaded_by_name ?? "—"} il {new Date(imp.created_at).toLocaleDateString("it-IT")}</span>
          {imp.notes && <span className="italic">{imp.notes}</span>}
        </div>
      </div>

      {/* Analisi — varia in base al tipo documento */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        {(imp.doc_type === "bilancio_verifica" || !imp.doc_type) ? (
          <AnalisiRischio
            areas={areas}
            importId={importId}
            assignmentId={assignmentId}
            quarterId={quarterId}
            hasPrev={hasPrev}
          />
        ) : (
          <AnalisiDocumento
            docType={imp.doc_type}
            importId={importId}
            assignmentId={assignmentId}
            quarterId={quarterId}
            entries={entries ?? []}
          />
        )}
      </div>

      {/* Tabella dettaglio conti */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Dettaglio conti
        </h2>
        <ImportTable
          entries={entries ?? []}
          importId={importId}
        />
      </div>
    </div>
  );
}
