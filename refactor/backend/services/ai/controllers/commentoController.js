'use strict';

const { commentoRevisione } = require('../lib/commentoRevisione');

/**
 * POST /api/commento-revisione
 * Endpoint interno: riceve i riscontri GIÀ CALCOLATI dalla riconciliazione
 * deterministica e restituisce un commento professionale per voce + una sintesi.
 * Il modello non produce numeri: valori ed esiti arrivano già decisi.
 *
 * Body:     { riscontri: [{codice, voce, valore_bilancio, valore_riscontrato,
 *                          esito, scostamento, fonti, note}], meta, salute }
 * Response: { commenti: { [codice]: string }, sintesi: string|null,
 *             salute: string|null, ai_used: boolean, ai_error?: string }
 */
async function commento(req, res) {
  const { riscontri, meta, salute } = req.body || {};

  if (!Array.isArray(riscontri)) {
    return res.status(400).json({ error: 'riscontri deve essere un array.' });
  }

  try {
    const { commenti, sintesi, giudizio_salute } = await commentoRevisione(riscontri, meta, salute);
    return res.json({ commenti, sintesi, salute: giudizio_salute, ai_used: true });
  } catch (err) {
    console.error('commentoRevisione Gemini error:', err.message);
    // Il commento è un di più: la revisione resta completa e corretta senza.
    return res.json({ commenti: {}, sintesi: null, salute: null, ai_used: false, ai_error: err.message });
  }
}

module.exports = { commento };
