"use client";

import { useState } from "react";
import Link from "next/link";

const DOC_TYPE_LABELS: Record<string, string> = {
  bilancio_verifica: "Bilancio di verifica",
  estratto_conto:    "Estratto conto bancario",
  rimanenze:         "Dettaglio rimanenze",
  registro_iva:      "Registro IVA",
  libro_giornale:    "Libro giornale",
  altro:             "Altro documento",
};

interface AccountingImport {
  id: string;
  filename: string;
  period_label: string;
  row_count: number | null;
  doc_type: string;
  created_at: string;
}

export function ImportSection({
  quarterId,
  assignmentId,
  initialImports,
  canUpload,
}: {
  quarterId: string;
  assignmentId: string;
  initialImports: AccountingImport[];
  uploaderNames: Record<string, string>;
  canUpload: boolean;
}) {
  const [imports, setImports] = useState<AccountingImport[]>(initialImports);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo import e tutti i dati contabili associati?")) return;
    setDeletingId(id);
    await fetch(`/api/tenant/accounting-imports/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setImports((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Import
          {imports.length > 0 && <span className="text-gray-400 font-normal"> ({imports.length})</span>}
        </h2>
        {canUpload && (
          <Link
            href={`/incarichi/${assignmentId}/trimestri/${quarterId}/import/nuovo`}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            + Importa documento
          </Link>
        )}
      </div>

      {imports.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nessun documento importato. Carica un bilancio, estratto conto, libro giornale o registro IVA.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {imports.map((imp) => (
            <li key={imp.id} className="flex items-center justify-between gap-3 py-3">
              <Link
                href={`/incarichi/${assignmentId}/trimestri/${quarterId}/import/${imp.id}`}
                className="flex-1 min-w-0 group"
              >
                <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                  {imp.period_label}
                </p>
                <div className="flex gap-x-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-400">{DOC_TYPE_LABELS[imp.doc_type] ?? imp.doc_type}</span>
                  <span className="text-xs text-gray-400">{imp.filename}</span>
                  {imp.row_count && <span className="text-xs text-gray-400">{imp.row_count} voci</span>}
                  <span className="text-xs text-gray-400">
                    {new Date(imp.created_at).toLocaleDateString("it-IT")}
                  </span>
                </div>
              </Link>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => handleDelete(imp.id)}
                  disabled={deletingId === imp.id}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0"
                >
                  {deletingId === imp.id ? "..." : "Elimina"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
