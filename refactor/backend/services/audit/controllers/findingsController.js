'use strict';

const { Finding } = require('../models');

const VALID_SEVERITIES = ['bassa', 'media', 'alta', 'critica'];
const VALID_STATUSES = ['aperto', 'in_gestione', 'risolto', 'chiuso'];

// GET /api/findings?quarter_id=...
const listFindings = async (req, res) => {
    try {
        const { quarter_id } = req.query;
        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });

        const findings = await Finding.findAll({
            where: { quarter_id, tenant_id: req.user.tenant_id },
            attributes: ['id', 'title', 'severity', 'status', 'raised_by', 'due_date', 'created_at', 'working_paper_id'],
            order: [['created_at', 'ASC']]
        });
        return res.json(findings);
    } catch (err) {
        console.error('listFindings error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/findings/:id
const getFinding = async (req, res) => {
    try {
        const finding = await Finding.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!finding) return res.status(404).json({ error: 'Rilievo non trovato' });
        return res.json(finding);
    } catch (err) {
        console.error('getFinding error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/findings
const createFinding = async (req, res) => {
    try {
        const { quarter_id, working_paper_id, title, description, recommendation, severity, due_date } = req.body;

        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });
        if (!title || title.trim().length === 0) return res.status(400).json({ error: 'title obbligatorio' });
        if (severity && !VALID_SEVERITIES.includes(severity)) {
            return res.status(400).json({ error: `severity non valida. Valori: ${VALID_SEVERITIES.join(', ')}` });
        }

        const finding = await Finding.create({
            tenant_id: req.user.tenant_id,
            quarter_id,
            working_paper_id: working_paper_id || null,
            title: title.trim(),
            description: description || null,
            recommendation: recommendation || null,
            severity: severity || 'media',
            due_date: due_date || null,
            raised_by: req.user.id || null
        });

        return res.status(201).json({ id: finding.id });
    } catch (err) {
        console.error('createFinding error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/findings/:id
const updateFinding = async (req, res) => {
    try {
        const finding = await Finding.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!finding) return res.status(404).json({ error: 'Rilievo non trovato' });

        const allowed = ['title', 'description', 'recommendation', 'severity', 'status', 'response', 'due_date', 'working_paper_id'];
        const updates = {};
        for (const key of allowed) {
            if (key in req.body) updates[key] = req.body[key];
        }

        if (updates.severity && !VALID_SEVERITIES.includes(updates.severity)) {
            return res.status(400).json({ error: `severity non valida. Valori: ${VALID_SEVERITIES.join(', ')}` });
        }
        if (updates.status && !VALID_STATUSES.includes(updates.status)) {
            return res.status(400).json({ error: `status non valido. Valori: ${VALID_STATUSES.join(', ')}` });
        }

        // Gestione automatica closed_at
        if (updates.status === 'chiuso') {
            updates.closed_at = new Date();
        } else if (updates.status) {
            updates.closed_at = null;
        }

        await finding.update(updates);
        return res.json({ ok: true });
    } catch (err) {
        console.error('updateFinding error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listFindings, getFinding, createFinding, updateFinding };
