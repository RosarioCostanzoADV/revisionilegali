"use client";

import { useState } from "react";

/**
 * Genera e scarica direttamente un PDF del documento (senza passare dalla finestra di
 * stampa del browser), catturando il contenuto attuale di `.print-page` — inclusa
 * un'eventuale versione modificata manualmente della carta di lavoro.
 */
export function SalvaPdfButton({ filename }: { filename: string }) {
  const [generando, setGenerando] = useState(false);

  async function salvaPdf() {
    const el = document.querySelector<HTMLElement>(".print-page");
    if (!el) return;

    setGenerando(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      // `pagebreak` è supportato a runtime da html2pdf.js ma assente dai tipi ambient
      // della libreria: il cast bypassa il controllo sulle proprietà in eccesso.
      const opzioni = {
        filename,
        margin: [20, 25, 20, 25], // mm — allineato a @page { margin: 2cm 2.5cm } del foglio di stampa
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy"], before: ".page-break" },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await html2pdf().set(opzioni as any).from(el).save();
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      onClick={salvaPdf}
      disabled={generando}
      className="inline-flex h-9 items-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {generando ? "Generazione PDF…" : "Salva PDF"}
    </button>
  );
}
