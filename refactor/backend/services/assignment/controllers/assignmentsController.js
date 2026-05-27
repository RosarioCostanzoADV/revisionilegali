'use strict';

const { Assignment, AssignmentMember, Quarter } = require('../models');

const VALID_TYPES = ['revisione_legale', 'collegio_sindacale', 'sindaco_unico'];
const VALID_STATUSES = ['aperto', 'in_corso', 'chiuso'];
const WRITER_ROLES = ['tenant_owner', 'revisor'];

// GET /api/assignments
const listAssignments = async (req, res) => {
    try {
        const assignments = await Assignment.findAll({
            where: { tenant_id: req.user.tenant_id },
            attributes: ['id', 'company_id', 'year', 'type', 'status', 'notes', 'created_at'],
            order: [['year', 'DESC'], ['created_at', 'DESC']]
        });
        return res.json(assignments);
    } catch (err) {
        console.error('listAssignments error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/assignments/:id
const getAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id },
            include: [
                { model: AssignmentMember, as: 'members', attributes: ['id', 'user_id', 'role'] },
                { model: Quarter, as: 'quarters', attributes: ['id', 'quarter', 'status', 'notes', 'closed_at', 'created_at'], order: [['quarter', 'ASC']] }
            ]
        });
        if (!assignment) return res.status(404).json({ error: 'Incarico non trovato' });
        return res.json(assignment);
    } catch (err) {
        console.error('getAssignment error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/assignments
const createAssignment = async (req, res) => {
    try {
        if (!WRITER_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const { company_id, year, type, notes, member_ids } = req.body;

        if (!company_id) return res.status(400).json({ error: 'company_id obbligatorio' });
        if (!year || !Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({ error: 'year non valido (intero 2000-2100)' });
        }
        if (!VALID_TYPES.includes(type)) {
            return res.status(400).json({ error: `type non valido. Valori: ${VALID_TYPES.join(', ')}` });
        }

        // Crea l'incarico
        const assignment = await Assignment.create({
            tenant_id: req.user.tenant_id,
            company_id,
            year,
            type,
            notes: notes || null,
            created_by: req.user.id || null
        });

        // Aggiunge membri del team
        if (Array.isArray(member_ids) && member_ids.length > 0) {
            await AssignmentMember.bulkCreate(
                member_ids.map(uid => ({ assignment_id: assignment.id, user_id: uid }))
            );
        }

        // Auto-crea 4 trimestri
        await Quarter.bulkCreate([1, 2, 3, 4].map(q => ({
            assignment_id: assignment.id,
            tenant_id: req.user.tenant_id,
            quarter: q
        })));

        return res.status(201).json({ id: assignment.id });
    } catch (err) {
        console.error('createAssignment error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/assignments/:id
const updateAssignment = async (req, res) => {
    try {
        if (!WRITER_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const assignment = await Assignment.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!assignment) return res.status(404).json({ error: 'Incarico non trovato' });

        const { status, notes, member_ids } = req.body;
        const updates = {};

        if (status !== undefined) {
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({ error: `status non valido. Valori: ${VALID_STATUSES.join(', ')}` });
            }
            updates.status = status;
        }
        if (notes !== undefined) updates.notes = notes;

        if (Object.keys(updates).length > 0) {
            await assignment.update(updates);
        }

        // Sostituisce i membri se forniti
        if (member_ids !== undefined) {
            await AssignmentMember.destroy({ where: { assignment_id: assignment.id } });
            if (Array.isArray(member_ids) && member_ids.length > 0) {
                await AssignmentMember.bulkCreate(
                    member_ids.map(uid => ({ assignment_id: assignment.id, user_id: uid }))
                );
            }
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error('updateAssignment error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/assignments/:id/quarters
const listQuarters = async (req, res) => {
    try {
        // Verifica che l'incarico appartenga al tenant
        const assignment = await Assignment.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id },
            attributes: ['id']
        });
        if (!assignment) return res.status(404).json({ error: 'Incarico non trovato' });

        const quarters = await Quarter.findAll({
            where: { assignment_id: req.params.id },
            attributes: ['id', 'quarter', 'status', 'notes', 'closed_at', 'created_at'],
            order: [['quarter', 'ASC']]
        });
        return res.json(quarters);
    } catch (err) {
        console.error('listQuarters error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listAssignments, getAssignment, createAssignment, updateAssignment, listQuarters };
