export type CategorySlug =
  | "bilancio"
  | "registro_fatture_acquisto"
  | "registro_fatture_vendita"
  | "mastrini"
  | "libro_giornale"
  | "f24_registri_iva"
  | "inventario_annuale";

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  description: string;
  /** Se true, il revisore può flaggare "Non applicabile" invece di caricare documenti. */
  canBeNA: boolean;
  /** Se true, mostra il pulsante "Importa da anno precedente". */
  isCompanyLinked: boolean;
  /** Se true, la categoria deve essere soddisfatta (o flaggata N/A se canBeNA) per sbloccare la revisione AI. */
  required: boolean;
  /**
   * True SOLO per il Bilancio trimestrale: è il file che va caricato PRIMA di
   * qualsiasi altra operazione e che sblocca il caricamento dei file a corredo.
   */
  isBilancio: boolean;
}

/** Slug del Bilancio: unica categoria da caricare per prima. */
export const BILANCIO_SLUG: CategorySlug = "bilancio";

export const ASSIGNMENT_CATEGORIES: CategoryDef[] = [
  {
    slug: "bilancio",
    label: "Bilancio trimestrale",
    description:
      "Bilancio di verifica del trimestre (stato patrimoniale e conto economico). È il punto di partenza della revisione: va caricato per primo, prima di ogni altro documento.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
    isBilancio: true,
  },
  {
    slug: "registro_fatture_acquisto",
    label: "Registro fatture di acquisto",
    description:
      "Registro IVA delle fatture di acquisto del periodo, per il riscontro dei costi e dei debiti verso fornitori con il bilancio.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
    isBilancio: false,
  },
  {
    slug: "registro_fatture_vendita",
    label: "Registro fatture di vendita",
    description:
      "Registro IVA delle fatture di vendita del periodo, per il riscontro dei ricavi e dei crediti verso clienti con il bilancio.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
    isBilancio: false,
  },
  {
    slug: "mastrini",
    label: "Tutti i mastrini",
    description:
      "Schede contabili (mastrini) di tutti i conti, per la riconciliazione di dettaglio delle voci di bilancio.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
    isBilancio: false,
  },
  {
    slug: "libro_giornale",
    label: "Libri Giornale",
    description:
      "Libro giornale del periodo con la registrazione cronologica delle scritture contabili.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
    isBilancio: false,
  },
  {
    slug: "f24_registri_iva",
    label: "F24 e registri IVA",
    description:
      "Modelli F24 di versamento e registri/liquidazioni IVA del periodo, per il riscontro dei debiti tributari.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
    isBilancio: false,
  },
  {
    slug: "inventario_annuale",
    label: "Inventario Annuale",
    description:
      "Libro degli inventari annuale (clienti, fornitori, beni ammortizzabili, fondi). Se non ancora disponibile per il trimestre può essere segnato come non applicabile.",
    canBeNA: true,
    isCompanyLinked: false,
    required: true,
    isBilancio: false,
  },
];

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return ASSIGNMENT_CATEGORIES.find((c) => c.slug === slug);
}

/** Restituisce la categoria del Bilancio (sempre presente). */
export function getBilancioCategory(): CategoryDef {
  return ASSIGNMENT_CATEGORIES.find((c) => c.isBilancio)!;
}
