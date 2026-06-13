export type CategorySlug =
  | "documenti_societari"
  | "bilancio_contabilita"
  | "schede_clienti_fornitori"
  | "dichiarazione_iva"
  | "liquidazione_iva"
  | "credito_iva"
  | "f24_erario"
  | "versamenti_inps"
  | "addizionali"
  | "estratti_conto"
  | "lul_buste_paga"
  | "cespiti"
  | "contratti_significativi"
  | "altro";

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
}

export const ASSIGNMENT_CATEGORIES: CategoryDef[] = [
  {
    slug: "documenti_societari",
    label: "Documenti Societari",
    description:
      "Statuto, visura camerale, atto costitutivo, libro soci, verbali assemblee e CDA, documenti d'identità di amministratori e sindaci.",
    canBeNA: false,
    isCompanyLinked: true,
    required: true,
  },
  {
    slug: "bilancio_contabilita",
    label: "Bilancio e Contabilità",
    description:
      "Bilancio di esercizio (stato patrimoniale, conto economico, nota integrativa), bilancio di verifica, libro giornale e libro degli inventari.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "schede_clienti_fornitori",
    label: "Schede Clienti e Fornitori",
    description:
      "Schede analitiche movimenti di clienti e fornitori, bilancio totale, riconciliazione partite aperte ed estratti di posizione.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "dichiarazione_iva",
    label: "Dichiarazione IVA",
    description:
      "Dichiarazione IVA annuale, comunicazioni LiPe (liquidazioni periodiche IVA), registri IVA acquisti e vendite.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "liquidazione_iva",
    label: "Liquidazione IVA",
    description:
      "Prospetti di liquidazione IVA periodica (mensile o trimestrale) con relativi F24 per il versamento dell'IVA.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "f24_erario",
    label: "F24 e Versamenti Erario",
    description:
      "Modelli F24, ricevute pagamento imposte dirette, ritenute d'acconto operate (mod. 770) e altri tributi erariali.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "estratti_conto",
    label: "Estratti Conto e Carte",
    description:
      "Estratti conto corrente bancari, estratti carte di credito e debito aziendali, riconciliazioni bancarie di fine periodo.",
    canBeNA: false,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "credito_iva",
    label: "Credito IVA",
    description:
      "Documentazione relativa al credito IVA maturato, istanze di rimborso presentate e compensazioni effettuate tramite F24.",
    canBeNA: true,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "versamenti_inps",
    label: "Versamenti INPS",
    description:
      "DM10/Uniemens, ricevute versamenti INPS, prospetti contributi previdenziali per dipendenti e collaboratori.",
    canBeNA: true,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "addizionali",
    label: "Addizionali Comunali e Regionali",
    description:
      "Modelli F24 relativi al versamento delle addizionali comunali e regionali IRPEF con prospetti di calcolo.",
    canBeNA: true,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "lul_buste_paga",
    label: "LUL e Buste Paga",
    description:
      "Libro Unico del Lavoro (LUL), buste paga dei dipendenti, Certificazioni Uniche (CU) e modello 770.",
    canBeNA: true,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "cespiti",
    label: "Registro Cespiti",
    description:
      "Registro beni ammortizzabili aggiornato, perizie di stima, contratti leasing e noleggio, schede analitiche cespiti.",
    canBeNA: true,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "contratti_significativi",
    label: "Contratti Significativi",
    description:
      "Contratti di affitto, mutui, finanziamenti, fideiussioni, contratti di agenzia e accordi commerciali rilevanti.",
    canBeNA: true,
    isCompanyLinked: false,
    required: true,
  },
  {
    slug: "altro",
    label: "Altro",
    description:
      "Documentazione aggiuntiva non classificata nelle categorie precedenti, utile ai fini della revisione.",
    canBeNA: true,
    isCompanyLinked: false,
    required: false,
  },
];

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return ASSIGNMENT_CATEGORIES.find((c) => c.slug === slug);
}
