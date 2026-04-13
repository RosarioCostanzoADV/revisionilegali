import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ModificaIncaricoForm } from "./ModificaIncaricoForm";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  revisione_legale: "Revisione legale",
  collegio_sindacale: "Collegio sindacale",
  sindaco_unico: "Sindaco unico",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aperto: { label: "Aperto", className: "bg-blue-100 text-blue-700" },
  in_corso: { label: "In corso", className: "bg-yellow-100 text-yellow-700" },
  chiuso: { label: "Chiuso", className: "bg-gray-100 text-gray-500" },
};

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor: "Revisore",
  collaborator: "Collaboratore",
  syndic: "Sindaco",
};

export default async function IncaricoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const [{ data: assignment }, { data: members }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, year, type, status, notes, created_at, company_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("assignment_members")
      .select("user_id")
      .eq("assignment_id", id),
  ]);

  if (!assignment) redirect("/incarichi");

  const { data: company } = assignment.company_id
    ? await supabase
        .from("companies")
        .select("id, name, fiscal_code, city")
        .eq("id", assignment.company_id)
        .maybeSingle()
    : { data: null };

  const memberUserIds = (members ?? []).map((m) => m.user_id);

  const [{ data: memberProfiles }, { data: allUsers }] = await Promise.all([
    memberUserIds.length
      ? supabase.from("user_profiles").select("id, full_name, role").in("id", memberUserIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("user_profiles")
      .select("id, full_name, role")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const canEdit = ["tenant_owner", "revisor"].includes(profile.role);
  const s = STATUS_LABELS[assignment.status] ?? STATUS_LABELS.aperto;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/incarichi" className="text-sm text-brand-600 hover:text-brand-700">
          ← Tutti gli incarichi
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {company?.name ?? "—"} — {assignment.year}
          </h1>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
            {s.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{TYPE_LABELS[assignment.type] ?? assignment.type}</p>
      </div>

      {/* Dettagli */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Dettagli</h2>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-500">Azienda</dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {company ? (
                <Link href={`/aziende/${company.id}`} className="text-brand-600 hover:text-brand-700">
                  {company.name}
                </Link>
              ) : "—"}
            </dd>
          </div>
          {company?.fiscal_code && (
            <div>
              <dt className="text-gray-500">Codice fiscale</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{company.fiscal_code}</dd>
            </div>
          )}
          {company?.city && (
            <div>
              <dt className="text-gray-500">Città</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{company.city}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Anno</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{assignment.year}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tipo</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{TYPE_LABELS[assignment.type] ?? assignment.type}</dd>
          </div>
        </dl>
        {assignment.notes && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Note</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.notes}</p>
          </div>
        )}
      </div>

      {/* Team — read-only */}
      {(memberProfiles ?? []).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Team assegnato</h2>
          <ul className="space-y-2">
            {(memberProfiles ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
                  {(p.full_name ?? "?")[0]?.toUpperCase()}
                </span>
                <span className="font-medium text-gray-900">{p.full_name ?? "—"}</span>
                <span className="text-gray-400">{ROLE_LABELS[p.role] ?? p.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modifica — solo per owner/revisor, azione deliberata */}
      {canEdit && (
        <ModificaIncaricoForm
          assignmentId={id}
          currentStatus={assignment.status}
          currentMemberIds={memberUserIds}
          allUsers={allUsers ?? []}
          notes={assignment.notes ?? null}
        />
      )}
    </div>
  );
}
