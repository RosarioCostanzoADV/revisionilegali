'use strict';

const { WorkingPaper } = require('../models');

const VALID_AREAS = [
    'cassa_banche', 'crediti_clienti', 'debiti_fornitori',
    'immobilizzazioni', 'rimanenze', 'patrimonio_netto',
    'ricavi', 'costi', 'imposte', 'adempimenti', 'altro'
];
const VALID_STATUSES = ['bozza', 'in_revisione', 'approvata'];
const WRITER_ROLES = ['tenant_owner', 'revisor'];

// GET /api/working-papers?quarter_id=...
const listWorkingPapers = async (req, res) => {
    try {
        const { quarter_id } = req.query;
        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });

        const papers = await WorkingPaper.findAll({
            where: { quarter_id, tenant_id: req.user.tenant_id },
            attributes: ['id', 'title', 'area', 'status', 'prepared_by', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'],
            order: [['created_at', 'ASC']]
        });
        return res.json(papers);
    } catch (err) {
        console.error('listWorkingPapers error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/working-papers/:id
const getWorkingPaper = async (req, res) => {
    try {
        const wp = await WorkingPaper.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!wp) return res.status(404).json({ error: 'Carta di lavoro non trovata' });
        return res.json(wp);
    } catch (err) {
        console.error('getWorkingPaper error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/working-papers
const createWorkingPaper = async (req, res) => {
    try {
        const { quarter_id, title, area, content } = req.body;

        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });
        if (!title || title.trim().length === 0) return res.status(400).json({ error: 'title obbligatorio' });
        if (!VALID_AREAS.includes(area)) {
            return res.status(400).json({ error: `area non valida. Valori: ${VALID_AREAS.join(', ')}` });
        }

        const wp = await WorkingPaper.create({
            tenant_id: req.user.tenant_id,
            quarter_id,
            title: title.trim(),
            area,
            content: content || null,
            prepared_by: req.user.id || null
        });

        return res.status(201).json({ id: wp.id });
    } catch (err) {
        console.error('createWorkingPaper error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/working-papers/:id
const updateWorkingPaper = async (req, res) => {
    try {
        const wp = await WorkingPaper.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!wp) return res.status(404).json({ error: 'Carta di lavoro non trovata' });

        const isOwnerOrRevisor = WRITER_ROLES.includes(req.user.role);
        const isPreparer = String(wp.prepared_by) === String(req.user.id);
        const { status, title, area, content, reopen_note } = req.body;

        // Logica di stato carta approvata
        if (wp.status === 'approvata') {
            if (!isOwnerOrRevisor) {
                return res.status(403).json({ error: 'Carta approvata: solo il revisore o titolare può riaprirla.' });
            }
            if (status !== 'in_revisione') {
                return res.status(403).json({ error: 'Carta approvata: unica transizione consentita → in_revisione.' });
            }
            if (!reopen_note || !String(reopen_note).trim()) {
                return res.status(400).json({ error: 'Specificare il motivo della riapertura.' });
            }
        }

        // Solo il preparer o owner/revisor possono modificare
        if (!isPreparer && !isOwnerOrRevisor) {
            return res.status(403).json({ error: 'Non autorizzato.' });
        }

        // Approvazione: solo owner/revisor
        if (status === 'approvata' && !isOwnerOrRevisor) {
            return res.status(403).json({ error: 'Solo revisore o titolare può approvare.' });
        }

        // Carta in_revisione: solo owner/revisor può modificarla (eccetto riportarla a bozza)
        if (wp.status === 'in_revisione' && !isOwnerOrRevisor && status !== 'bozza') {
            return res.status(403).json({ error: 'Carta in revisione: solo il revisore può modificarla.' });
        }

        if (status !== undefined && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `status non valido. Valori: ${VALID_STATUSES.join(', ')}` });
        }
        if (area !== undefined && !VALID_AREAS.includes(area)) {
            return res.status(400).json({ error: `area non valida. Valori: ${VALID_AREAS.join(', ')}` });
        }

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (area !== undefined) updates.area = area;
        if (content !== undefined) updates.content = content;
        if (status !== undefined) {
            updates.status = status;
            if (status === 'approvata') {
                updates.reviewed_by = req.user.id;
                updates.reviewed_at = new Date();
            }
        }

        await wp.update(updates);
        return res.json({ ok: true });
    } catch (err) {
        console.error('updateWorkingPaper error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/working-papers/:id
const deleteWorkingPaper = async (req, res) => {
    try {
        const wp = await WorkingPaper.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!wp) return res.status(404).json({ error: 'Carta di lavoro non trovata' });
        await wp.destroy();
        return res.json({ ok: true });
    } catch (err) {
        console.error('deleteWorkingPaper error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listWorkingPapers, getWorkingPaper, createWorkingPaper, updateWorkingPaper, deleteWorkingPaper };
