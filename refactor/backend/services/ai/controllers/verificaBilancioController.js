'use strict';

const { verificaBilancioAnnuale } = require('../lib/verificaBilancio');

/**
 * POST /api/verifica-bilancio
 * Endpoint interno: dato il bilancio caricato per il 4° trimestre, stabilisce se è
 * il bilancio ANNUALE o un bilancio trimestrale caricato per errore al posto suo.
 *
 * Body:     { meta, contoEconomicoPresente, testo }
 * Response: { annuale: boolean, motivazione: string }
 *
 * A differenza di commento-revisione, qui un fallimento dell'AI NON può essere
 * silenziosamente ignorato: senza questa verifica non c'è modo di bloccare un
 * bilancio trimestrale caricato per sbaglio, quindi l'errore viene propagato
 * (500) invece di restituire un default ottimistico.
 */
async function verificaBilancio(req, res) {
  const { meta, contoEconomicoPresente, testo } = req.body || {};

  if (typeof testo !== 'string' || !testo.trim()) {
    return res.status(400).json({ error: 'testo obbligatorio.' });
  }

  try {
    const esito = await verificaBilancioAnnuale({ meta, contoEconomicoPresente, testo });
    return res.json(esito);
  } catch (err) {
    console.error('verificaBilancioAnnuale error:', err.message);
    return res.status(502).json({ error: `Verifica AI del bilancio non disponibile: ${err.message}` });
  }
}

module.exports = { verificaBilancio };
