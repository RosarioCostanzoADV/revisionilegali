import { redirect } from "next/navigation";
import { gwJson } from "@/lib/api";
import { PrintTrigger } from "./PrintTrigger";
import { SalvaPdfButton } from "./SalvaPdfButton";
import { CartaLavoroEditor } from "./CartaLavoroEditor";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  revisione_legale: "Revisione legale",
  collegio_sindacale: "Collegio sindacale",
  sindaco_unico: "Sindaco unico",
};

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trimestre", 2: "2° Trimestre", 3: "3° Trimestre", 4: "4° Trimestre",
};

const QUARTER_RANGES: Record<number, string> = {
  1: "1 gennaio – 31 marzo",
  2: "1 aprile – 30 giugno",
  3: "1 luglio – 30 settembre",
  4: "1 ottobre – 31 dicembre",
};

export default async function CartaLavoroStampaPage({
  params,
}: {
  params: Promise<{ id: string; quarterId: string }>;
}) {
  const { id: assignmentId, quarterId } = await params;

  const [me, quarter, assignment] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{
      id: string; quarter: number; status: string; assignment_id: string;
    }>(`/api/quarters/${quarterId}`),
    gwJson<{
      id: string; year: number; type: string;
      company_id?: string; company_name?: string; company_fiscal_code?: string;
    }>(`/api/assignments/${assignmentId}`),
  ]);

  if (!quarter || !assignment) redirect(`/incarichi/${assignmentId}/trimestri/${quarterId}/revisione`);

  const fallbackCompany = !assignment.company_name && assignment.company_id
    ? await gwJson<{ name?: string; city?: string; fiscal_code?: string; vat_number?: string }>(
        `/api/companies/${assignment.company_id}`
      )
    : null;

  const companyName = assignment.company_name ?? fallbackCompany?.name ?? "—";
  const companyCity = fallbackCompany?.city ?? null;
  const companyFiscalCode = assignment.company_fiscal_code ?? fallbackCompany?.fiscal_code ?? fallbackCompany?.vat_number ?? null;
  const typeLabel = TYPE_LABELS[assignment.type] ?? assignment.type;
  const quarterLabel = QUARTER_LABELS[quarter.quarter] ?? `${quarter.quarter}° Trimestre`;
  const quarterRange = QUARTER_RANGES[quarter.quarter] ?? "";
  const tenantName = me?.tenant?.name ?? null;
  const revisorName = me?.profile?.full_name ?? null;
  const pdfFilename = `Carta di lavoro - ${companyName} - ${quarterLabel} ${assignment.year}.pdf`
    .replace(/[/\\?%*:|"<>]/g, "-");

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          .print-page { padding: 2cm 2.5cm; max-width: 100%; box-shadow: none !important; }
          .page-break { break-before: page; }
          /* I browser scartano di default gli sfondi colorati in stampa: senza questa
             regola le note del revisore (sfondo giallo, bordo colorato, badge esito)
             risulterebbero praticamente invisibili sul foglio stampato. */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @page { margin: 2cm 2.5cm; size: A4; }
        body { background: #f3f4f6; font-family: 'Times New Roman', serif; }
        .cdl-table { width: 100%; border-collapse: collapse; }
        .cdl-table th, .cdl-table td {
          border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; vertical-align: top;
          font-size: 12px; line-height: 1.5;
        }
        .cdl-table th { background: #f3f4f6; font-weight: 700; color: #2a4b7e; }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href={`/incarichi/${assignmentId}/trimestri/${quarterId}/revisione`}
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            ← Torna alla revisione
          </a>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Carta di lavoro — {quarterLabel} {assignment.year}</span>
        </div>
        <div className="flex items-center gap-2">
          <SalvaPdfButton filename={pdfFilename} />
          <PrintTrigger />
        </div>
      </div>

      <div className="mx-auto my-8">
        <div className="print-page bg-white shadow-lg mx-auto max-w-4xl px-16 py-14 min-h-screen">
          {tenantName && (
            <div className="text-right text-xs text-gray-500 mb-8 pb-4 border-b border-gray-200">
              {tenantName}
            </div>
          )}

          {companyName !== "—" && (
            <div className="mb-6 text-sm text-gray-700">
              <p className="font-semibold">{companyName}</p>
              {companyCity && <p>{companyCity}</p>}
              {companyFiscalCode && <p>C.F. / P.IVA: {companyFiscalCode}</p>}
            </div>
          )}

          <h1
            className="text-xl font-bold mb-8 text-center uppercase tracking-wide"
            style={{ color: "#2a4b7e" }}
          >
            Carte di lavoro — {typeLabel}
          </h1>

          <CartaLavoroEditor
            assignmentId={assignmentId}
            quarterId={quarterId}
            companyName={companyName}
            companyCity={companyCity}
            year={assignment.year}
            quarterLabel={quarterLabel}
            quarterRange={quarterRange}
            typeLabel={typeLabel}
            revisorName={revisorName}
          />
        </div>
      </div>
    </>
  );
}
