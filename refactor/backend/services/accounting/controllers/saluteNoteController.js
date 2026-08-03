'use strict';

const { SaluteNota } = require('../models');

const ESITI_VALIDI = ['segnalazione_inviata', 'anomalia_non_riscontrata'];

// GET /api/accounting/salute-note?quarter_id=...
const listSaluteNote = async (req, res) => {
    try {
        const { quarter_id } = req.query;
        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });

        const note = await SaluteNota.findAll({
            where: { quarter_id, tenant_id: req.user.tenant_id },
            attributes: ['id', 'indicatore', 'nota', 'esito', 'created_by', 'created_at', 'updated_at']
        });
        return res.json(note);
    } catch (err) {
        console.error('listSaluteNote error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/accounting/salute-note — crea o aggiorna la nota per (quarter_id, indicatore)
const upsertSaluteNota = async (req, res) => {
    try {
        const { quarter_id, indicatore, nota, esito } = req.body;
        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });
        if (!indicatore || !String(indicatore).trim()) {
            return res.status(400).json({ error: 'indicatore obbligatorio' });
        }
        if (esito != null && !ESITI_VALIDI.includes(esito)) {
            return res.status(400).json({ error: `esito non valido (valori ammessi: ${ESITI_VALIDI.join(', ')})` });
        }

        const [record] = await SaluteNota.findOrCreate({
            where: { quarter_id, indicatore, tenant_id: req.user.tenant_id },
            defaults: {
                nota: nota ?? null,
                esito: esito ?? null,
                created_by: req.user.id || null,
            }
        });

        await record.update({
            nota: nota ?? null,
            esito: esito ?? null,
        });

        return res.json({ id: record.id });
    } catch (err) {
        console.error('upsertSaluteNota error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/accounting/salute-note/:id
const deleteSaluteNota = async (req, res) => {
    try {
        const record = await SaluteNota.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!record) return res.status(404).json({ error: 'Nota non trovata' });
        await record.destroy();
        return res.json({ ok: true });
    } catch (err) {
        console.error('deleteSaluteNota error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listSaluteNote, upsertSaluteNota, deleteSaluteNota };
