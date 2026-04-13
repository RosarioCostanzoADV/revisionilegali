"use client";

import { useState } from "react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  fiscal_code: string | null;
  vat_number: string | null;
  sector: string | null;
  city: string | null;
  province: string | null;
  is_archived: boolean;
  created_at: string;
}

export function AziendeClient({ initialCompanies }: { initialCompanies: Company[] }) {
  const [showArchived, setShowArchived] = useState(false);

  const filtered = initialCompanies.filter((c) =>
    showArchived ? true : !c.is_archived,
  );
  const archivedCount = initialCompanies.filter((c) => c.is_archived).length;

  return (
    <div className="space-y-4">
      {/* Filtro archiviate */}
      {archivedCount > 0 && (
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="text-sm text-brand-600 hover:underline"
        >
          {showArchived ? "Nascondi archiviate" : `Mostra archiviate (${archivedCount})`}
        </button>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Nessuna azienda ancora. Creane una.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Nome", "C.F. / P.IVA", "Settore", "Città", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 ${c.is_archived ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.name}
                    {c.is_archived && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        Archiviata
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.fiscal_code ?? c.vat_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.sector ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.city ? `${c.city}${c.province ? ` (${c.province})` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/aziende/${c.id}`}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      Apri →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
