"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ASSIGNMENT_CATEGORIES, BILANCIO_SLUG, type CategoryDef } from "@/lib/assignment-categories";
import { DocumentBrowserModal, type DocItem } from "./DocumentBrowserModal";

function CategoryIcon({ slug }: { slug: string }) {
  const icons: Record<string, React.ReactNode> = {
    bilancio: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    registro_fatture_acquisto: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    registro_fatture_vendita: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    mastrini: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m8.625 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
      </svg>
    ),
    libro_giornale: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    f24_registri_iva: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
    inventario_annuale: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.5c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  };
  return (
    <span className="text-gray-500">{icons[slug] ?? icons.bilancio}</span>
  );
}

type CategoryStatus = "complete" | "na" | "bilancio_skipped" | "pending_required" | "pending_optional" | "locked";

function getCategoryStatus(
  cat: CategoryDef,
  docCount: number,
  isNA: boolean,
  locked: boolean
): CategoryStatus {
  if (docCount > 0) return "complete";
  if (locked) return "locked";
  if (cat.isBilancio && isNA) return "bilancio_skipped";
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
  bilancio_skipped: {
    border: "border-l-orange-400",
    bg: "bg-orange-50/40",
    chipBg: "bg-orange-100",
    chipText: "text-orange-700",
    label: "Bilancio non caricato",
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
  locked: {
    border: "border-l-gray-200",
    bg: "bg-gray-50",
    chipBg: "bg-gray-100",
    chipText: "text-gray-400",
    label: "Bloccata",
  },
};

interface AssignmentChecklistProps {
  assignmentId: string;
  quarterId?: string;
  canEdit: boolean;
  initialDocsByCategory: Record<string, DocItem[]>;
  initialNaSlugs: string[];
  previousAssignmentId: string | null;
  initialBilancioSkipped?: boolean;
}

export function AssignmentChecklist({
  assignmentId,
  quarterId,
  canEdit,
  initialDocsByCategory,
  initialNaSlugs,
  previousAssignmentId,
  initialBilancioSkipped = false,
}: AssignmentChecklistProps) {
  const [docsByCategory, setDocsByCategory] = useState<Record<string, DocItem[]>>(initialDocsByCategory);
  const [naSet, setNaSet] = useState<Set<string>>(new Set(initialNaSlugs));
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  // ── Bilancio facoltativo: il revisore può scegliere esplicitamente di
  //    procedere senza bilancio per questo trimestre, sbloccando il resto. ──
  const [bilancioSkipped, setBilancioSkipped] = useState(initialBilancioSkipped);
  const [togglingBilancioSkip, setTogglingBilancioSkip] = useState(false);
  const [ricalcolando, setRicalcolando] = useState(false);
  const [revisioneCalcolata, setRevisioneCalcolata] = useState(false);
  const router = useRouter();

  // Se esiste già un report salvato per questo trimestre, il bottone porta semplicemente
  // alla revisione già calcolata ("Vai alla Revisione") invece di suggerire di avviarla.
  useEffect(() => {
    if (!quarterId) return;
    let annullato = false;
    fetch(`/api/accounting/review/${quarterId}`)
      .then((res) => { if (!annullato) setRevisioneCalcolata(res.ok); })
      .catch(() => {});
    return () => { annullato = true; };
  }, [quarterId]);

  // Ricalcolo esplicito della Revisione AI: l'unico altro punto (oltre al bottone dentro
  // la pagina di revisione) da cui è permesso ricalcolare da capo invece di mostrare l'ultima
  // revisione salvata.
  async function handleRicalcolaRevisione() {
    if (!quarterId || ricalcolando) return;
    setRicalcolando(true);
    try {
      await fetch(`/api/accounting/review/${quarterId}`, { method: "POST" });
    } catch {
      // Se il ricalcolo fallisce, la pagina di revisione mostrerà l'errore o l'ultima versione salvata.
    } finally {
      router.push(`/incarichi/${assignmentId}/trimestri/${quarterId}/revisione`);
    }
  }

  const activeCategory = ASSIGNMENT_CATEGORIES.find((c) => c.slug === activeSlug) ?? null;

  function handleDocsChange(slug: string, newDocs: DocItem[]) {
    setDocsByCategory((prev) => ({ ...prev, [slug]: newDocs }));
    // Caricare un bilancio annulla automaticamente la scelta di procedere senza.
    if (slug === BILANCIO_SLUG && newDocs.length > 0 && bilancioSkipped) {
      setBilancioSkipped(false);
      if (quarterId) {
        fetch(`/api/quarters/${quarterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bilancio_skipped: false }),
        }).catch(() => {});
      }
    }
  }

  async function handleToggleBilancioSkip() {
    if (!quarterId || togglingBilancioSkip) return;
    const next = !bilancioSkipped;
    if (next && !confirm(
      "Procedere senza il bilancio trimestrale? Potrai caricarlo in qualsiasi momento in seguito, dalla stessa scheda."
    )) {
      return;
    }
    setTogglingBilancioSkip(true);
    setBilancioSkipped(next);
    try {
      const res = await fetch(`/api/quarters/${quarterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bilancio_skipped: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setBilancioSkipped(!next);
    } finally {
      setTogglingBilancioSkip(false);
    }
  }

  function handleNAChange(slug: string, isNA: boolean) {
    setNaSet((prev) => {
      const next = new Set(prev);
      if (isNA) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  // ── Bilancio-first: la prima operazione è sempre caricare il Bilancio ─────────
  const bilancioCat = ASSIGNMENT_CATEGORIES.find((c) => c.isBilancio)!;
  const corredoCats = ASSIGNMENT_CATEGORIES.filter((c) => !c.isBilancio);
  const bilancioDocs = docsByCategory[bilancioCat.slug] ?? [];
  const bilancioPresent = bilancioDocs.length > 0;
  // I file a corredo restano bloccati finché non è stato caricato il Bilancio,
  // a meno che il revisore abbia scelto esplicitamente di procedere senza.
  const corredoLocked = !bilancioPresent && !bilancioSkipped;

  function isSatisfied(cat: CategoryDef): boolean {
    const count = (docsByCategory[cat.slug] ?? []).length;
    return count > 0 || (cat.canBeNA && naSet.has(cat.slug));
  }

  const requiredCategories = ASSIGNMENT_CATEGORIES.filter((c) => c.required);
  const totalRequired = requiredCategories.length;
  const satisfiedCount = requiredCategories.filter(isSatisfied).length;

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
                : !bilancioPresent && !bilancioSkipped
                  ? "Carica il Bilancio trimestrale per iniziare la revisione, oppure procedi senza bilancio."
                  : !bilancioPresent && bilancioSkipped
                    ? "Completa i file a corredo o segnali come non applicabili. La Revisione AI richiede comunque il bilancio."
                    : "Completa i file a corredo o segnali come non applicabili per sbloccare la revisione AI."}
            </p>
          </div>
          {aiUnlocked && quarterId ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/incarichi/${assignmentId}/trimestri/${quarterId}/revisione`}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 active:bg-brand-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {revisioneCalcolata ? "Vai alla Revisione" : "Avvia Revisione"}
              </Link>
              <button
                type="button"
                onClick={handleRicalcolaRevisione}
                disabled={ricalcolando}
                title="Ricalcola da capo la Revisione AI (ignora l'ultima calcolata)"
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className={`h-4 w-4 ${ricalcolando ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                {ricalcolando ? "Ricalcolo…" : "Ricalcola"}
              </button>
            </div>
          ) : (
            <button
              disabled
              className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Avvia Revisione
            </button>
          )}
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

      {/* Evidenza: il trimestre procede senza bilancio (scelta esplicita del revisore) */}
      {bilancioSkipped && !bilancioPresent && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-orange-800">Bilancio non caricato per questo trimestre</p>
            <p className="mt-0.5 text-xs text-orange-700 leading-relaxed">
              Il revisore ha scelto di procedere senza il bilancio trimestrale e di caricare gli altri documenti.
              Il bilancio può essere aggiunto in qualsiasi momento dalla scheda &quot;Bilancio trimestrale&quot; qui sotto.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 1: Bilancio (sempre per primo) ─────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">1</span>
          <h3 className="text-sm font-semibold text-gray-700">Bilancio trimestrale</h3>
          {bilancioPresent && (
            <span className="text-xs font-medium text-emerald-600">✓ caricato</span>
          )}
          {!bilancioPresent && bilancioSkipped && (
            <span className="text-xs font-medium text-orange-600">⚠ non caricato</span>
          )}
        </div>
        {(() => {
          const status = getCategoryStatus(bilancioCat, bilancioDocs.length, bilancioSkipped, false);
          const cfg = statusConfig[status];
          return (
            <button
              onClick={() => setActiveSlug(bilancioCat.slug)}
              className={`group relative flex w-full flex-col gap-3 rounded-xl border border-gray-200 border-l-4 ${cfg.border} ${cfg.bg} p-4 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-gray-400 group-hover:text-brand-500 transition-colors">
                  <CategoryIcon slug={bilancioCat.slug} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{bilancioCat.label}</p>
                  <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{bilancioCat.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.chipBg} ${cfg.chipText}`}>
                    {status === "complete" && (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                    {(status === "pending_required" || status === "bilancio_skipped") && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                      </svg>
                    )}
                    {cfg.label}
                  </span>
                  {bilancioDocs.length > 0 && (
                    <span className="text-xs text-gray-400">{bilancioDocs.length} doc</span>
                  )}
                </div>
                <svg className="h-4 w-4 text-gray-300 group-hover:text-brand-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          );
        })()}

        {/* Possibilità di non caricare il bilancio, per sbloccare subito il resto */}
        {canEdit && quarterId && !bilancioPresent && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-200 px-4 py-2.5">
            <p className="text-xs text-gray-500">
              {bilancioSkipped
                ? "Stai procedendo senza il bilancio trimestrale."
                : "Non hai ancora il bilancio di questo trimestre?"}
            </p>
            <button
              type="button"
              onClick={handleToggleBilancioSkip}
              disabled={togglingBilancioSkip}
              className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              {togglingBilancioSkip
                ? "..."
                : bilancioSkipped
                  ? "Annulla, richiedi il bilancio"
                  : "Procedi senza bilancio →"}
            </button>
          </div>
        )}
      </div>

      {/* ── Step 2: File a corredo (sbloccati dopo il Bilancio) ──────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${corredoLocked ? "bg-gray-300" : "bg-brand-600"}`}>2</span>
          <h3 className="text-sm font-semibold text-gray-700">Documenti a corredo</h3>
          {corredoLocked && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Carica prima il Bilancio
            </span>
          )}
        </div>

        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${corredoLocked ? "opacity-60" : ""}`}>
          {corredoCats.map((cat) => {
            const docs = docsByCategory[cat.slug] ?? [];
            const isNA = naSet.has(cat.slug);
            const status = getCategoryStatus(cat, docs.length, isNA, corredoLocked);
            const cfg = statusConfig[status];
            const disabled = corredoLocked;

            return (
              <button
                key={cat.slug}
                onClick={() => { if (!disabled) setActiveSlug(cat.slug); }}
                disabled={disabled}
                title={disabled ? "Carica prima il Bilancio trimestrale" : undefined}
                className={`group relative flex flex-col gap-3 rounded-xl border border-gray-200 border-l-4 ${cfg.border} ${cfg.bg} p-4 text-left shadow-sm transition-all duration-150 ${
                  disabled ? "cursor-not-allowed" : "hover:shadow-md hover:border-gray-300"
                }`}
              >
                {/* Icon + title */}
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 text-gray-400 transition-colors ${disabled ? "" : "group-hover:text-brand-500"}`}>
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
                      {status === "locked" && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      )}
                      {cfg.label}
                    </span>
                    {docs.length > 0 && (
                      <span className="text-xs text-gray-400">{docs.length} doc</span>
                    )}
                  </div>
                  <svg className={`h-4 w-4 text-gray-300 transition-colors shrink-0 ${disabled ? "" : "group-hover:text-brand-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
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
    </>
  );
}
