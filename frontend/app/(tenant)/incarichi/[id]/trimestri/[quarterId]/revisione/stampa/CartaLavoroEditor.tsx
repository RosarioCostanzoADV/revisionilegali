"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { sanitizeEditableHtml } from "@/lib/sanitizeEditableHtml";

/**
 * Wrapper editabile del documento del trimestre: sopra il contenuto generato dal calcolo
 * (passato come `children` — carta di lavoro per Q1-Q3, relazione finale per il 4°
 * trimestre) aggiunge la possibilità di modificarlo liberamente come un foglio Word
 * (contentEditable) e di salvare la versione modificata.
 *
 * Una volta salvata una versione manuale, questa ha priorità e viene mostrata al posto
 * di quella rigenerata dal calcolo — finché non viene esplicitamente scartata ("Riporta
 * allo stato originale"). Coerente con la logica già adottata per la revisione: l'ultima
 * versione salvata vince, nessun ricalcolo/rigenerazione silenziosa.
 */
export function CartaLavoroEditor({ quarterId, children }: { quarterId: string; children: ReactNode }) {

  const [caricato, setCaricato] = useState(false);
  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let annullato = false;
    (async () => {
      const meRes = await fetch("/api/auth/me").catch(() => null);
      if (meRes?.ok) {
        const me = await meRes.json();
        if (!annullato) setCanEdit(["tenant_owner", "revisor"].includes(me?.profile?.role));
      }
      const res = await fetch(`/api/accounting/carta-lavoro/${quarterId}`).catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        if (!annullato) setSavedHtml(data.html);
      }
      if (!annullato) setCaricato(true);
    })();
    return () => { annullato = true; };
  }, [quarterId]);

  function formatta(comando: string) {
    document.execCommand(comando);
    containerRef.current?.focus();
  }

  async function salvaModifiche() {
    if (!containerRef.current) return;
    setSaving(true);
    setErrore(null);
    try {
      const html = sanitizeEditableHtml(containerRef.current.innerHTML);
      const res = await fetch(`/api/accounting/carta-lavoro/${quarterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Errore durante il salvataggio.");
      setSavedHtml(html);
      setEditing(false);
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  async function rigeneraDalCalcolo() {
    if (!confirm("Scartare le modifiche manuali e tornare alla versione calcolata automaticamente? L'operazione non è reversibile.")) {
      return;
    }
    setErrore(null);
    try {
      await fetch(`/api/accounting/carta-lavoro/${quarterId}`, { method: "DELETE" });
    } catch {
      // Se la delete fallisce lato server, mostriamo comunque la versione calcolata:
      // al prossimo salvataggio andrà a sovrascrivere quella salvata.
    }
    setSavedHtml(null);
    setEditing(false);
  }

  if (!caricato) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 no-print">
        <svg className="h-7 w-7 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      {canEdit && (
        <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          {!editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Modifica come documento
              </button>
              {savedHtml && (
                <>
                  <span className="text-xs text-gray-400">Versione modificata manualmente</span>
                  <button
                    type="button"
                    onClick={rigeneraDalCalcolo}
                    className="ml-auto rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Riporta allo stato originale
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white p-1">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatta("bold")} className="rounded px-2 py-1 text-sm font-bold hover:bg-gray-100" title="Grassetto">B</button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatta("italic")} className="rounded px-2 py-1 text-sm italic hover:bg-gray-100" title="Corsivo">I</button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatta("underline")} className="rounded px-2 py-1 text-sm underline hover:bg-gray-100" title="Sottolineato">U</button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatta("insertUnorderedList")} className="rounded px-2 py-1 text-sm hover:bg-gray-100" title="Elenco puntato">• Lista</button>
              </div>
              <button
                type="button"
                onClick={salvaModifiche}
                disabled={saving}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Salvataggio…" : "Salva modifiche"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              {salvato && <span className="text-xs text-emerald-600">Salvato</span>}
            </>
          )}
          {errore && <p className="w-full text-xs text-red-600">{errore}</p>}
        </div>
      )}

      <div
        ref={containerRef}
        contentEditable={editing}
        suppressContentEditableWarning
        className={editing ? "rounded-lg outline outline-2 outline-brand-300 outline-offset-4" : ""}
      >
        {savedHtml != null ? (
          <div dangerouslySetInnerHTML={{ __html: savedHtml }} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
