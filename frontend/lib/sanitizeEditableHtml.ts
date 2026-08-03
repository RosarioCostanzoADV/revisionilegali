/**
 * Sanitizzazione minima per l'HTML prodotto dalla carta di lavoro editabile
 * (contentEditable) prima del salvataggio. Il documento è visibile ad altri utenti
 * dello stesso tenant: rimuove script/stili globali/iframe e attributi eseguibili
 * (on*, javascript:) per evitare che una modifica malevola diventi una XSS persistente.
 *
 * Non è un sostituto di una libreria come DOMPurify — copre solo i vettori rilevanti
 * per contenuto prodotto da contentEditable nel browser (che non inserisce mai tag
 * `<script>` di suo, ma un utente potrebbe incollare markup arbitrario).
 */
export function sanitizeEditableHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const TAG_DENYLIST = ["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form"];
  for (const tag of TAG_DENYLIST) {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  }

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const toStrip: { el: Element; attr: string }[] = [];
  let node = walker.nextNode() as Element | null;
  while (node) {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || value.startsWith("javascript:") || value.startsWith("data:text/html")) {
        toStrip.push({ el: node, attr: attr.name });
      }
    }
    node = walker.nextNode() as Element | null;
  }
  for (const { el, attr } of toStrip) el.removeAttribute(attr);

  return doc.body.innerHTML;
}
