import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor:      "Revisore",
  collaborator: "Collaboratore",
  syndic:       "Sindaco",
};

const SEVERITY_LABELS: Record<string, { label: string; className: string }> = {
  low:      { label: "Bassa",   className: "bg-gray-100 text-gray-600" },
  medium:   { label: "Media",   className: "bg-yellow-100 text-yellow-700" },
  high:     { label: "Alta",    className: "bg-orange-100 text-orange-700" },
  critical: { label: "Critica", className: "bg-red-100 text-red-700 font-semibold" },
};

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  revisione_legale:  "Revisione legale",
  collegio_sindacale:"Collegio sindacale",
  sindaco_unico:     "Sindaco unico",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  const [
    { count: totalAssignments },
    { count: activeAssignments },
    { count: openFindings },
    { count: pendingPapers },
    { data: recentAssignments },
    { data: urgentFindings },
  ] = await Promise.all([
    supabase.from("assignments").select("id", { count: "exact", head: true }),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "in_corso"),
    supabase.from("findings").select("id", { count: "exact", head: true }).neq("status", "chiuso"),
    supabase.from("working_papers").select("id", { count: "exact", head: true }).eq("status", "in_revisione"),
    supabase
      .from("assignments")
      .select("id, year, type, status, company_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("findings")
      .select("id, title, severity, status, due_date, assignment_id, quarter_id")
      .neq("status", "chiuso")
      .in("severity", ["high", "critical"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
  ]);

  // Resolve company names for recent assignments
  const companyIds = [...new Set((recentAssignments ?? []).map((a) => a.company_id).filter(Boolean))];
  const { data: companies } = companyIds.length
    ? await supabase.from("companies").select("id, name").in("id", companyIds)
    : { data: [] };
  const companyMap: Record<string, string> = Object.fromEntries(
    (companies ?? []).map((c) => [c.id, c.name]),
  );

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    aperto:   { label: "Aperto",   className: "bg-blue-100 text-blue-700" },
    in_corso: { label: "In corso", className: "bg-yellow-100 text-yellow-700" },
    chiuso:   { label: "Chiuso",   className: "bg-gray-100 text-gray-500" },
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Ciao{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {ROLE_LABELS[profile.role] ?? profile.role} — ecco un riepilogo dell&apos;attività.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/incarichi" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 transition-colors">
          <p className="text-xs uppercase tracking-wide text-gray-500">Incarichi totali</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalAssignments ?? 0}</p>
        </Link>
        <Link href="/incarichi" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 transition-colors">
          <p className="text-xs uppercase tracking-wide text-gray-500">In corso</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">{activeAssignments ?? 0}</p>
        </Link>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Rilievi aperti</p>
          <p className={`mt-1 text-3xl font-bold ${(openFindings ?? 0) > 0 ? "text-orange-600" : "text-gray-900"}`}>
            {openFindings ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Carte da approvare</p>
          <p className={`mt-1 text-3xl font-bold ${(pendingPapers ?? 0) > 0 ? "text-blue-600" : "text-gray-900"}`}>
            {pendingPapers ?? 0}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Incarichi recenti */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Incarichi recenti</h2>
            <Link href="/incarichi" className="text-sm text-brand-600 hover:text-brand-700">
              Vedi tutti →
            </Link>
          </div>
          {!(recentAssignments ?? []).length ? (
            <p className="text-sm text-gray-400">Nessun incarico ancora.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentAssignments!.map((a) => {
                const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.aperto!;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/incarichi/${a.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 -mx-5 px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {companyMap[a.company_id] ?? "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {a.year} · {ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Rilievi urgenti */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Rilievi urgenti aperti</h2>
          </div>
          {!(urgentFindings ?? []).length ? (
            <p className="text-sm text-gray-400">Nessun rilievo urgente aperto.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {urgentFindings!.map((f) => {
                const sev = SEVERITY_LABELS[f.severity] ?? SEVERITY_LABELS.medium!;
                const dueDate = f.due_date ? new Date(f.due_date) : null;
                const isOverdue = dueDate && dueDate < today;
                return (
                  <li key={f.id}>
                    <Link
                      href={`/incarichi/${f.assignment_id}/trimestri/${f.quarter_id}/rilievi/${f.id}`}
                      className="flex items-start justify-between gap-3 py-3 hover:bg-gray-50 -mx-5 px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{f.title}</p>
                        {dueDate && (
                          <p className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
                            {isOverdue ? "Scaduto il " : "Scade il "}
                            {dueDate.toLocaleDateString("it-IT")}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs ${sev.className}`}>
                        {sev.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
