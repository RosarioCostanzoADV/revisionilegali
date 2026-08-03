'use strict';

const { riscontroWithGemini, fallbackRiscontri } = require('../lib/riscontroBilancio');

/**
 * POST /api/riscontro-bilancio
 * Endpoint interno: riceve le figure chiave del bilancio + gli estratti dei
 * documenti a corredo e restituisce i riscontri (double-check) elaborati con AI.
 *
 * Body: { figure: { controlli: [{voce, valore_bilancio, dettaglio?}] },
 *         corredo: [{name, category, excerpt}] }
 * Response: { riscontri: [...], ai_used: boolean, ai_error?: string }
 */
async function riscontroBilancio(req, res) {
  const { figure, corredo } = req.body || {};

  if (!figure || !Array.isArray(figure.controlli)) {
    return res.status(400).json({ error: 'figure.controlli deve essere un array.' });
  }

  try {
    const riscontri = await riscontroWithGemini(figure, corredo || []);
    return res.json({ riscontri, ai_used: true });
  } catch (err) {
    console.error('riscontroBilancio Gemini error:', err.message);
    return res.json({
      riscontri: fallbackRiscontri(figure),
      ai_used: false,
      ai_error: err.message,
    });
  }
}

module.exports = { riscontroBilancio };
