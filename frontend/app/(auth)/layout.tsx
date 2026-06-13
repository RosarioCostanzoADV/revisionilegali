import type { ReactNode } from "react";

const FEATURES = [
  "Workflow strutturati per ogni incarico di revisione",
  "Carte di lavoro e verbali automatizzati",
  "Analisi documenti contabili con AI",
  "Sicuro, cloud e sempre accessibile",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">

      {/* ── Left: brand panel ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1f3a] px-12 py-12 lg:flex lg:w-[52%]">

        {/* Decorative background shapes */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-white/[0.04]" />
          <div className="absolute -bottom-36 -left-20 h-96 w-96 rounded-full bg-white/[0.04]" />
          <div className="absolute bottom-1/3 right-8 h-40 w-40 rounded-full bg-teal-500/10" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Revisio" className="h-7 w-auto" />
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-md">
          {/* Tagline */}
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px w-6 bg-teal-400" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-teal-400 uppercase">
              Ordine. Metodo. Risultati.
            </span>
            <span className="h-px w-6 bg-teal-400" />
          </div>

          <h2 className="text-4xl font-bold leading-tight text-white">
            La piattaforma per<br />
            <span className="text-teal-400">la revisione legale.</span>
          </h2>

          <p className="mt-5 text-sm leading-relaxed text-white/50">
            Pensato per revisori legali e collegi sindacali che vogliono lavorare
            con ordine, efficienza e piena conformità normativa.
          </p>

          <ul className="mt-8 space-y-3.5">
            {FEATURES.map((label) => (
              <li key={label} className="flex items-start gap-3 text-sm text-white/75">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 ring-1 ring-teal-500/30">
                  <svg className="h-3 w-3 text-teal-400" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-white/25">
          © {new Date().getFullYear()} Revisio · Tutti i diritti riservati
        </p>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Logo mobile */}
        <div className="mb-10 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Revisio" className="h-8 w-auto" />
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  );
}
