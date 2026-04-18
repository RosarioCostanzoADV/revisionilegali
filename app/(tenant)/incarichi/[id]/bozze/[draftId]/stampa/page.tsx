import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintTrigger } from "./PrintTrigger";

export const dynamic = "force-dynamic";

export default async function StampaPage({
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

  const [{ data: draft }, { data: assignment }] = await Promise.all([
    supabase
      .from("drafts")
      .select("id, title, type, content, status")
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
    ? await supabase.from("companies").select("name, fiscal_code, city").eq("id", assignment.company_id).maybeSingle()
    : { data: null };

  const { data: tenant } = profile.tenant_id
    ? await supabase.from("tenants").select("name").eq("id", profile.tenant_id).maybeSingle()
    : { data: null };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          .print-page { padding: 2cm 2.5cm; max-width: 100%; box-shadow: none !important; }
        }
        @page { margin: 2cm 2.5cm; size: A4; }
        body { background: #f3f4f6; font-family: 'Times New Roman', serif; }
      `}</style>

      {/* Toolbar — nascosta in stampa */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href={`/incarichi/${assignmentId}/bozze/${draftId}`}
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            ← Torna all&apos;editor
          </a>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">{draft.title}</span>
        </div>
        <PrintTrigger />
      </div>

      {/* Documento */}
      <div className="mx-auto my-8 no-print:max-w-3xl">
        <div className="print-page bg-white shadow-lg mx-auto max-w-3xl px-16 py-14 min-h-screen">
          {/* Intestazione studio */}
          {tenant?.name && (
            <div className="text-right text-xs text-gray-500 mb-8 pb-4 border-b border-gray-200">
              {tenant.name}
            </div>
          )}

          {/* Destinatario / Azienda */}
          {company && (
            <div className="mb-8 text-sm text-gray-700">
              <p className="font-semibold">{company.name}</p>
              {company.city && <p>{company.city}</p>}
              {company.fiscal_code && <p>C.F. / P.IVA: {company.fiscal_code}</p>}
            </div>
          )}

          {/* Titolo documento */}
          <h1 className="text-xl font-bold text-gray-900 mb-8 text-center uppercase tracking-wide">
            {draft.title}
          </h1>

          {/* Contenuto */}
          <div className="text-sm leading-relaxed text-gray-800">
            <pre className="whitespace-pre-wrap font-serif text-sm leading-7">{draft.content}</pre>
          </div>
        </div>
      </div>
    </>
  );
}
