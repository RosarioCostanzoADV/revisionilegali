"use client";

import { useState } from "react";
import { ASSIGNMENT_CATEGORIES } from "@/lib/assignment-categories";

// Etichette per slug non più presenti tra le categorie correnti (documenti storici).
const EXTRA_CATEGORY_LABELS: Record<string, string> = {
  estratto_conto: "Estratto conto",
  contratto: "Contratto",
  fattura: "Fattura / Nota spese",
  verbale: "Verbale",
  relazione: "Relazione",
  altro: "Altro",
  // Slug del vecchio modello di revisione trimestre (compatibilità storica).
  documenti_societari: "Documenti Societari",
  bilancio_contabilita: "Bilancio e Contabilità",
  schede_clienti_fornitori: "Schede Clienti e Fornitori",
  dichiarazione_iva: "Dichiarazione IVA",
  liquidazione_iva: "Liquidazione IVA",
  credito_iva: "Credito IVA",
  f24_erario: "F24 e Versamenti Erario",
  versamenti_inps: "Versamenti INPS",
  addizionali: "Addizionali Comunali e Regionali",
  estratti_conto: "Estratti Conto e Carte",
  lul_buste_paga: "LUL e Buste Paga",
  cespiti: "Registro Cespiti",
  contratti_significativi: "Contratti Significativi",
};

const QUARTER_LABELS: Record<number, string> = {
  1: "1° Trim.", 2: "2° Trim.", 3: "3° Trim.", 4: "4° Trim.",
};

export type RepoDoc = {
  id: string;
  name: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  created_at: string;
  quarter_number: number;
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null): string {
  if (!mime) return "📄";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv") return "📗";
  if (mime.includes("word") || mime.includes("document")) return "📘";
  if (mime.startsWith("image/")) return "🖼️";
  return "📄";
}

interface Props {
  docsByCategory: Record<string, RepoDoc[]>;
}

export function AssignmentDocumentRepository({ docsByCategory }: Props) {
  const assignmentSlugs = ASSIGNMENT_CATEGORIES.map((c) => c.slug as string);
  const allSlugs = Object.keys(docsByCategory);
  const extraSlugs = allSlugs.filter((s) => !assignmentSlugs.includes(s) && (docsByCategory[s]?.length ?? 0) > 0);
  const orderedSlugs = [...assignmentSlugs, ...extraSlugs];

  const slugsWithDocs = orderedSlugs.filter((slug) => (docsByCategory[slug]?.length ?? 0) > 0);

  const [expanded, setExpanded] = useState<Set<string>>(new Set(slugsWithDocs));

  const totalDocs = Object.values(docsByCategory).reduce((sum, docs) => sum + docs.length, 0);

  function getCategoryLabel(slug: string): string {
    const cat = ASSIGNMENT_CATEGORIES.find((c) => c.slug === slug);
    if (cat) return cat.label;
    return EXTRA_CATEGORY_LABELS[slug] ?? slug;
  }

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  if (totalDocs === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 shadow-sm text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">Nessun documento ancora caricato</p>
          <p className="text-xs text-gray-400">I documenti caricati nei trimestri appariranno qui organizzati per categoria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Archivio Documentale</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {slugsWithDocs.length} cartel{slugsWithDocs.length === 1 ? "a" : "e"} · {totalDocs} document{totalDocs === 1 ? "o" : "i"}
            </p>
          </div>
        </div>
      </div>

      {/* Category folders */}
      <div className="divide-y divide-gray-100">
        {orderedSlugs.map((slug) => {
          const docs = docsByCategory[slug] ?? [];
          if (docs.length === 0) return null;

          const isOpen = expanded.has(slug);
          const label = getCategoryLabel(slug);

          return (
            <div key={slug}>
              <button
                onClick={() => toggle(slug)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <svg
                  className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <svg className="h-4 w-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
                <span className="text-xs text-gray-400 shrink-0 tabular-nums">{docs.length}</span>
              </button>

              {isOpen && (
                <div className="bg-gray-50/70 border-t border-gray-100 divide-y divide-gray-100">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 pl-12 pr-5 py-2.5">
                      <span className="text-base leading-none shrink-0">{fileIcon(doc.mime_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-400">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 mr-1.5">
                            {QUARTER_LABELS[doc.quarter_number] ?? `T${doc.quarter_number}`}
                          </span>
                          {formatSize(doc.file_size)}
                        </p>
                      </div>
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        download
                        title="Scarica"
                        className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
