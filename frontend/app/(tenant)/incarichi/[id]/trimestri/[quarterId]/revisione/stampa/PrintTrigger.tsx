"use client";

export function PrintTrigger() {
  // Auto-print non attivo — l'utente sceglie quando stampare
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex h-9 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
    >
      Stampa
    </button>
  );
}
