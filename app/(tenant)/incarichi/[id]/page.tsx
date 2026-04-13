import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AssignmentStatusForm } from "./AssignmentStatusForm";

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

  const { data: assignment } = await supabase
    .from("assignments")
    .select(`
      id, year, type, status, notes, created_at,
      companies ( id, name, fiscal_code, city ),
      assignment_members ( user_id, user_profiles ( id, full_name, role ) )
    `)
    .eq("id", id)
    .maybeSingle();

  if (!assignment) redirect("/incarichi");

  const canEdit = ["tenant_owner", "revisor"].includes(profile.role);
  const company = assignment.companies as { id: string; name: string; fiscal_code: string | null; city: string | null } | null;
  const members = (assignment.assignment_members ?? []) as Array<{
    user_id: string;
    user_profiles: { id: string; full_name: string | null; role: string } | null;
  }>;

  const s = STATUS_LABELS[assignment.status] ?? STATUS_LABELS.aperto;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

      {/* Dettagli incarico */}
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

      {/* Stato */}
      {canEdit && (
        <AssignmentStatusForm
          assignmentId={id}
          currentStatus={assignment.status}
        />
      )}

      {/* Team */}
      {members.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Team assegnato</h2>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 text-sm">
                <span className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
                  {(m.user_profiles?.full_name ?? "?")[0]?.toUpperCase()}
                </span>
                <span className="font-medium text-gray-900">{m.user_profiles?.full_name ?? "—"}</span>
                <span className="text-gray-400">{ROLE_LABELS[m.user_profiles?.role ?? ""] ?? m.user_profiles?.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
