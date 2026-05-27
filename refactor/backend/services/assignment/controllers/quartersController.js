'use strict';

const { Quarter, Assignment } = require('../models');

const VALID_STATUSES = ['aperto', 'in_corso', 'chiuso'];
const WRITER_ROLES = ['tenant_owner', 'revisor'];

// GET /api/quarters/:id
const getQuarter = async (req, res) => {
    try {
        const quarter = await Quarter.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id },
            attributes: ['id', 'quarter', 'status', 'notes', 'closed_at', 'created_at', 'assignment_id']
        });
        if (!quarter) return res.status(404).json({ error: 'Trimestre non trovato' });
        return res.json(quarter);
    } catch (err) {
        console.error('getQuarter error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/quarters/:id
const updateQuarter = async (req, res) => {
    try {
        if (!WRITER_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const quarter = await Quarter.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!quarter) return res.status(404).json({ error: 'Trimestre non trovato' });

        const { status, notes } = req.body;
        const updates = {};

        if (status !== undefined) {
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({ error: `status non valido. Valori: ${VALID_STATUSES.join(', ')}` });
            }
            updates.status = status;
            // Imposta/azzera closed_at in base allo stato
            if (status === 'chiuso') {
                updates.closed_at = new Date();
            } else {
                updates.closed_at = null;
            }
        }

        if (notes !== undefined) updates.notes = notes;

        await quarter.update(updates);
        return res.json({ ok: true });
    } catch (err) {
        console.error('updateQuarter error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { getQuarter, updateQuarter };
