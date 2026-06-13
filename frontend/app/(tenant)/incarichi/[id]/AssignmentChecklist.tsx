"use client";

import { useState } from "react";
import { ASSIGNMENT_CATEGORIES, type CategoryDef } from "@/lib/assignment-categories";
import { DocumentBrowserModal, type DocItem } from "./DocumentBrowserModal";
import { AIReviewModal } from "./AIReviewModal";

function CategoryIcon({ slug }: { slug: string }) {
  const icons: Record<string, React.ReactNode> = {
    documenti_societari: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    bilancio_contabilita: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    schede_clienti_fornitori: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    dichiarazione_iva: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    liquidazione_iva: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    f24_erario: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
    estratti_conto: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    credito_iva: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
      </svg>
    ),
    versamenti_inps: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    addizionali: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    lul_buste_paga: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    cespiti: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.5c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    contratti_significativi: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    altro: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  };
  return (
    <span className="text-gray-500">{icons[slug] ?? icons.altro}</span>
  );
}

type CategoryStatus = "complete" | "na" | "pending_required" | "pending_optional";

function getCategoryStatus(
  cat: CategoryDef,
  docCount: number,
  isNA: boolean
): CategoryStatus {
  if (docCount > 0) return "complete";
  if (isNA) return "na";
  if (!cat.canBeNA && cat.required) return "pending_required";
  return "pending_optional";
}

const statusConfig: Record<CategoryStatus, {
  border: string;
  bg: string;
  chipBg: string;
  chipText: string;
  label: string;
}> = {
  complete: {
    border: "border-l-emerald-400",
    bg: "bg-white",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    label: "Completata",
  },
  na: {
    border: "border-l-gray-300",
    bg: "bg-white",
    chipBg: "bg-gray-100",
    chipText: "text-gray-500",
    label: "Non applicabile",
  },
  pending_required: {
    border: "border-l-amber-400",
    bg: "bg-white",
    chipBg: "bg-amber-50",
    chipText: "text-amber-700",
    label: "In attesa",
  },
  pending_optional: {
    border: "border-l-gray-200",
    bg: "bg-white",
    chipBg: "bg-gray-50",
    chipText: "text-gray-400",
    label: "Facoltativa",
  },
};

interface AssignmentChecklistProps {
  assignmentId: string;
  quarterId?: string;
  canEdit: boolean;
  initialDocsByCategory: Record<string, DocItem[]>;
  initialNaSlugs: string[];
  previousAssignmentId: string | null;
}

export function AssignmentChecklist({
  assignmentId,
  quarterId,
  canEdit,
  initialDocsByCategory,
  initialNaSlugs,
  previousAssignmentId,
}: AssignmentChecklistProps) {
  const [docsByCategory, setDocsByCategory] = useState<Record<string, DocItem[]>>(initialDocsByCategory);
  const [naSet, setNaSet] = useState<Set<string>>(new Set(initialNaSlugs));
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  const activeCategory = ASSIGNMENT_CATEGORIES.find((c) => c.slug === activeSlug) ?? null;

  function handleDocsChange(slug: string, newDocs: DocItem[]) {
    setDocsByCategory((prev) => ({ ...prev, [slug]: newDocs }));
  }

  function handleNAChange(slug: string, isNA: boolean) {
    setNaSet((prev) => {
      const next = new Set(prev);
      if (isNA) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  const requiredCategories = ASSIGNMENT_CATEGORIES.filter((c) => c.required);
  const totalRequired = requiredCategories.length;

  const satisfiedCount = requiredCategories.filter((c) => {
    const count = (docsByCategory[c.slug] ?? []).length;
    const isNA = naSet.has(c.slug);
    return count > 0 || (c.canBeNA && isNA);
  }).length;

  const aiUnlocked = satisfiedCount === totalRequired;
  const progressPct = totalRequired > 0 ? Math.round((satisfiedCount / totalRequired) * 100) : 0;

  return (
    <>
      {/* Progress bar + AI button */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {satisfiedCount} di {totalRequired} categorie completate
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {aiUnlocked
                ? "Tutte le categorie sono state soddisfatte. La revisione AI è disponibile."
                : "Completa le categorie richieste o segnale come non applicabili per sbloccare la revisione AI."}
            </p>
          </div>
          <button
            onClick={() => setShowAIModal(true)}
            disabled={!aiUnlocked}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              aiUnlocked
                ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Avvia Revisione AI
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              aiUnlocked ? "bg-emerald-500" : "bg-brand-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">0%</span>
          <span className={`text-xs font-medium ${aiUnlocked ? "text-emerald-600" : "text-brand-600"}`}>
            {progressPct}%
          </span>
          <span className="text-xs text-gray-400">100%</span>
        </div>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ASSIGNMENT_CATEGORIES.map((cat) => {
          const docs = docsByCategory[cat.slug] ?? [];
          const isNA = naSet.has(cat.slug);
          const status = getCategoryStatus(cat, docs.length, isNA);
          const cfg = statusConfig[status];

          return (
            <button
              key={cat.slug}
              onClick={() => setActiveSlug(cat.slug)}
              className={`group relative flex flex-col gap-3 rounded-xl border border-gray-200 border-l-4 ${cfg.border} ${cfg.bg} p-4 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150`}
            >
              {/* Icon + title */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-gray-400 group-hover:text-brand-500 transition-colors">
                  <CategoryIcon slug={cat.slug} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{cat.label}</p>
                  <p className="mt-0.5 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </div>

              {/* Status row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.chipBg} ${cfg.chipText}`}>
                    {status === "complete" && (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                    {status === "na" && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {status === "pending_required" && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                      </svg>
                    )}
                    {cfg.label}
                  </span>
                  {docs.length > 0 && (
                    <span className="text-xs text-gray-400">{docs.length} doc</span>
                  )}
                </div>
                <svg className="h-4 w-4 text-gray-300 group-hover:text-brand-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Document browser modal */}
      {activeCategory && (
        <DocumentBrowserModal
          category={activeCategory}
          assignmentId={assignmentId}
          quarterId={quarterId}
          docs={docsByCategory[activeCategory.slug] ?? []}
          isNA={naSet.has(activeCategory.slug)}
          canEdit={canEdit}
          previousAssignmentId={activeCategory.isCompanyLinked ? previousAssignmentId : null}
          onClose={() => setActiveSlug(null)}
          onDocsChange={handleDocsChange}
          onNAChange={handleNAChange}
        />
      )}

      {/* AI review modal */}
      {showAIModal && <AIReviewModal onClose={() => setShowAIModal(false)} />}
    </>
  );
}
