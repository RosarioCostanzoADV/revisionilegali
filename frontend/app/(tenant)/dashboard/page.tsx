import Link from "next/link";
import { gwJson } from "@/lib/api";

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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aperto:   { label: "Aperto",   className: "bg-blue-100 text-blue-700" },
  in_corso: { label: "In corso", className: "bg-yellow-100 text-yellow-700" },
  chiuso:   { label: "Chiuso",   className: "bg-gray-100 text-gray-500" },
};

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  revisione_legale:   "Revisione legale",
  collegio_sindacale: "Collegio sindacale",
  sindaco_unico:      "Sindaco unico",
};

export default async function DashboardPage() {
  const [me, assignments, findings] = await Promise.all([
    gwJson<{ profile: { full_name: string | null; role: string }; tenant: { name: string } | null }>("/api/auth/me"),
    gwJson<{ id: string; company_id?: string; year: number; type: string; status: string; company_name?: string }[]>("/api/assignments?limit=5"),
    gwJson<{ id: string; title: string; severity: string; status: string; due_date: string | null; assignment_id: string }[]>(
      "/api/audit/findings?status_neq=chiuso&severity_in=high,critical&limit=5&sort=due_date",
    ),
  ]);

  const profile = me?.profile;
  const allAssignments = await gwJson<{ id: string; status: string }[]>("/api/assignments?limit=1000");
  const allFindings = await gwJson<{ id: string; status: string }[]>("/api/audit/findings?limit=1000");
  const allPapers = await gwJson<{ id: string; status: string }[]>("/api/audit/working-papers?limit=1000");

  const totalAssignments = allAssignments?.length ?? 0;
  const activeAssignments = allAssignments?.filter((a) => a.status === "in_corso").length ?? 0;
  const openFindings = allFindings?.filter((f) => f.status !== "chiuso").length ?? 0;
  const pendingPapers = allPapers?.filter((p) => p.status === "in_revisione").length ?? 0;

  const recentAssignments = assignments ?? [];
  const shouldResolveCompanies = recentAssignments.some((a) => !a.company_name && !!a.company_id);
  const companies = shouldResolveCompanies
    ? await gwJson<{ id: string; name: string }[]>("/api/companies")
    : [];
  const companyNameById = Object.fromEntries((companies ?? []).map((c) => [c.id, c.name]));
  const urgentFindings = findings ?? [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Ciao{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role} — ecco un riepilogo dell&apos;attività.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/incarichi" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 transition-colors">
          <p className="text-xs uppercase tracking-wide text-gray-500">Incarichi totali</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalAssignments}</p>
        </Link>
        <Link href="/incarichi" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 transition-colors">
          <p className="text-xs uppercase tracking-wide text-gray-500">In corso</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">{activeAssignments}</p>
        </Link>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Rilievi aperti</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">{openFindings}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Carte in revisione</p>
          <p className="mt-1 text-3xl font-bold text-brand-600">{pendingPapers}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Incarichi recenti</h2>
            <Link href="/incarichi" className="text-sm text-brand-600 hover:text-brand-700">Vedi tutti →</Link>
          </div>
          {recentAssignments.length === 0 ? (
            <p className="text-sm text-gray-400">Nessun incarico.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentAssignments.map((a) => {
                const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.aperto!;
                const companyName = a.company_name ?? (a.company_id ? companyNameById[a.company_id] : undefined) ?? "—";
                return (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {companyName} — {a.year}
                      </p>
                      <p className="text-xs text-gray-500">{ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                      <Link href={`/incarichi/${a.id}`} className="text-xs text-brand-600 hover:text-brand-700">
                        Apri →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Rilievi urgenti</h2>
          {urgentFindings.length === 0 ? (
            <p className="text-sm text-gray-400">Nessun rilievo urgente.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {urgentFindings.map((f) => {
                const sev = SEVERITY_LABELS[f.severity] ?? SEVERITY_LABELS.medium!;
                const due = f.due_date ? new Date(f.due_date) : null;
                const isOverdue = due ? due < today : false;
                return (
                  <li key={f.id} className="py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{f.title}</p>
                      <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sev.className}`}>
                        {sev.label}
                      </span>
                    </div>
                    {due && (
                      <p className={`mt-0.5 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
                        Scadenza: {due.toLocaleDateString("it-IT")}
                        {isOverdue ? " (scaduto)" : ""}
                      </p>
                    )}
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
