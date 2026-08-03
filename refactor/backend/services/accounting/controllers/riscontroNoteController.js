'use strict';

const { RiscontroNota } = require('../models');

const ESITI_VALIDI = ['segnalazione_inviata', 'anomalia_non_riscontrata'];

// GET /api/accounting/riscontro-note?quarter_id=...
const listRiscontroNote = async (req, res) => {
    try {
        const { quarter_id } = req.query;
        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });

        const note = await RiscontroNota.findAll({
            where: { quarter_id, tenant_id: req.user.tenant_id },
            attributes: ['id', 'codice', 'nota', 'esito', 'created_by', 'created_at', 'updated_at']
        });
        return res.json(note);
    } catch (err) {
        console.error('listRiscontroNote error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/accounting/riscontro-note — crea o aggiorna la nota per (quarter_id, codice)
const upsertRiscontroNota = async (req, res) => {
    try {
        const { quarter_id, codice, nota, esito } = req.body;
        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });
        if (!codice || !String(codice).trim()) {
            return res.status(400).json({ error: 'codice obbligatorio' });
        }
        if (esito != null && !ESITI_VALIDI.includes(esito)) {
            return res.status(400).json({ error: `esito non valido (valori ammessi: ${ESITI_VALIDI.join(', ')})` });
        }

        const [record] = await RiscontroNota.findOrCreate({
            where: { quarter_id, codice, tenant_id: req.user.tenant_id },
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
        console.error('upsertRiscontroNota error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/accounting/riscontro-note/:id
const deleteRiscontroNota = async (req, res) => {
    try {
        const record = await RiscontroNota.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!record) return res.status(404).json({ error: 'Nota non trovata' });
        await record.destroy();
        return res.json({ ok: true });
    } catch (err) {
        console.error('deleteRiscontroNota error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listRiscontroNote, upsertRiscontroNota, deleteRiscontroNota };
