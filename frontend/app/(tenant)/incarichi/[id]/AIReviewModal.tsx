"use client";

interface AIReviewModalProps {
  onClose: () => void;
}

export function AIReviewModal({ onClose }: AIReviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
          <svg className="h-7 w-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Revisione AI</h2>
        <p className="mt-2 text-sm text-gray-500">
          Work in progress. Funzionalità AI da implementare.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Il modulo di analisi intelligente dei documenti sarà disponibile a breve.
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
