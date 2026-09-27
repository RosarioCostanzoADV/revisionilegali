'use strict';

/**
 * Replica lato backend di frontend/lib/assignment-categories.ts — SOLO i campi che
 * servono a calcolare la completezza documentale di un trimestre (slug, required,
 * canBeNA). Duplicato deliberatamente invece di condiviso fra i due servizi (frontend
 * e accounting-service non condividono un modulo comune): se le categorie cambiano,
 * vanno aggiornate in entrambi i posti.
 */
const ASSIGNMENT_CATEGORIES = [
  { slug: 'bilancio', label: 'Bilancio trimestrale', required: true, canBeNA: false },
  { slug: 'registro_fatture_acquisto', label: 'Registro fatture di acquisto', required: true, canBeNA: false },
  { slug: 'registro_fatture_vendita', label: 'Registro fatture di vendita', required: true, canBeNA: false },
  { slug: 'mastrini', label: 'Tutti i mastrini', required: true, canBeNA: false },
  { slug: 'libro_giornale', label: 'Libri Giornale', required: true, canBeNA: false },
  { slug: 'f24_registri_iva', label: 'F24 e registri IVA', required: true, canBeNA: false },
  { slug: 'estratti_conto_banca', label: 'Estratti conto bancari', required: false, canBeNA: false },
  { slug: 'inventario_annuale', label: 'Inventario Annuale', required: true, canBeNA: true },
];

/**
 * Verifica se un trimestre ha la documentazione completa: ogni categoria richiesta ha
 * almeno un documento caricato PER QUEL TRIMESTRE, oppure è stata segnata "non
 * applicabile" a livello di incarico (i flag N/A sono per l'intero incarico, non per
 * singolo trimestre — stessa scelta già fatta nel resto dell'app).
 *
 * @param {{category:string}[]} docs - documenti del trimestre (già filtrati per quarter_id)
 * @param {{category_slug:string, is_na:boolean}[]} categoryFlags - flag N/A dell'incarico
 * @returns {{completo:boolean, categorieMancanti:{slug:string, label:string}[]}}
 */
function verificaCompletezzaTrimestre(docs, categoryFlags) {
  const presentiPerCategoria = new Set((docs ?? []).map((d) => d.category));
  const naSet = new Set((categoryFlags ?? []).filter((f) => f.is_na).map((f) => f.category_slug));

  const categorieMancanti = ASSIGNMENT_CATEGORIES
    .filter((c) => c.required)
    .filter((c) => !presentiPerCategoria.has(c.slug) && !(c.canBeNA && naSet.has(c.slug)))
    .map((c) => ({ slug: c.slug, label: c.label }));

  return { completo: categorieMancanti.length === 0, categorieMancanti };
}

module.exports = { ASSIGNMENT_CATEGORIES, verificaCompletezzaTrimestre };
