'use strict';

const { mapBilancioWithGemini, enrichAllLocally } = require('../lib/mapBilancio');

/**
 * POST /api/map-bilancio
 * Endpoint interno: riceve voci contabili e restituisce le mappature civilistiche.
 *
 * Body: { entries: [{ account_code, account_name, balance, balance_prev, pdf_section }] }
 * Response: { entries: [{ ...original, voce_standard, schema_civilistico, audit_area }] }
 *
 * Chiamato da accounting-service dopo il parsing del file.
 */
async function mapBilancio(req, res) {
  const { entries } = req.body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries deve essere un array non vuoto.' });
  }

  // Limite ragionevole per evitare prompt troppo grandi
  if (entries.length > 2000) {
    return res.status(400).json({ error: 'Massimo 2000 voci per richiesta.' });
  }

  try {
    const mapped = await mapBilancioWithGemini(entries);
    res.json({ entries: mapped });
  } catch (err) {
    console.error('mapBilancio Gemini error:', err.message);
    // Fallback deterministico — restituisce mappatura locale senza AI
    const fallback = enrichAllLocally(entries);
    res.json({ entries: fallback, warning: 'Gemini non disponibile, usata classificazione locale.' });
  }
}

/**
 * POST /api/map-bilancio/local
 * Mappatura deterministica senza AI (utile per test e fallback espliciti).
 */
function mapBilancioLocal(req, res) {
  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries deve essere un array non vuoto.' });
  }
  const mapped = enrichAllLocally(entries);
  res.json({ entries: mapped });
}

module.exports = { mapBilancio, mapBilancioLocal };
