'use strict';

const { CartaLavoroDocumento } = require('../models');

// GET /api/accounting/carta-lavoro/:quarterId — versione modificata manualmente, se esiste
const getCartaLavoro = async (req, res) => {
    try {
        const { quarterId } = req.params;
        const doc = await CartaLavoroDocumento.findOne({
            where: { quarter_id: quarterId, tenant_id: req.user.tenant_id },
        });
        if (!doc) return res.status(404).json({ error: 'Nessuna versione modificata salvata per questo trimestre.' });
        return res.json({ html: doc.html, updated_at: doc.updated_at });
    } catch (err) {
        console.error('getCartaLavoro error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/accounting/carta-lavoro/:quarterId — salva (crea o sovrascrive) la versione modificata
const upsertCartaLavoro = async (req, res) => {
    try {
        const { quarterId } = req.params;
        const { html } = req.body;
        if (!html || !String(html).trim()) {
            return res.status(400).json({ error: 'html obbligatorio' });
        }

        const [doc] = await CartaLavoroDocumento.findOrCreate({
            where: { quarter_id: quarterId, tenant_id: req.user.tenant_id },
            defaults: { html, updated_by: req.user.id || null },
        });
        await doc.update({ html, updated_by: req.user.id || null });

        return res.json({ ok: true, updated_at: doc.updated_at });
    } catch (err) {
        console.error('upsertCartaLavoro error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/accounting/carta-lavoro/:quarterId — scarta le modifiche manuali (torna al calcolo automatico)
const deleteCartaLavoro = async (req, res) => {
    try {
        const { quarterId } = req.params;
        const doc = await CartaLavoroDocumento.findOne({
            where: { quarter_id: quarterId, tenant_id: req.user.tenant_id },
        });
        if (!doc) return res.status(404).json({ error: 'Nessuna versione modificata da eliminare.' });
        await doc.destroy();
        return res.json({ ok: true });
    } catch (err) {
        console.error('deleteCartaLavoro error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { getCartaLavoro, upsertCartaLavoro, deleteCartaLavoro };
