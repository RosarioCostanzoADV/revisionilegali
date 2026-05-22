'use strict';

const { Plan } = require('../models');

// GET /api/plans
const listPlans = async (req, res) => {
    try {
        const where = {};
        // utenti non-super_admin vedono solo piani attivi
        if (req.user.role !== 'super_admin') {
            where.is_active = true;
        }
        const plans = await Plan.findAll({ where, order: [['created_at', 'ASC']] });
        return res.json(plans);
    } catch (err) {
        console.error('listPlans error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/plans/:id
const getPlan = async (req, res) => {
    try {
        const plan = await Plan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ error: 'Piano non trovato' });
        return res.json(plan);
    } catch (err) {
        console.error('getPlan error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/plans  (solo super_admin)
const createPlan = async (req, res) => {
    try {
        const {
            name, max_assignments, max_users, storage_gb,
            ai_quota, vigilance_module, ai_drafts_module, advanced_import
        } = req.body;

        if (!name || max_assignments == null || max_users == null || storage_gb == null) {
            return res.status(400).json({ error: 'name, max_assignments, max_users e storage_gb obbligatori' });
        }

        const plan = await Plan.create({
            name,
            max_assignments,
            max_users,
            storage_gb,
            ai_quota: ai_quota ?? null,
            vigilance_module: vigilance_module ?? false,
            ai_drafts_module: ai_drafts_module ?? false,
            advanced_import: advanced_import ?? false
        });

        return res.status(201).json(plan);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Piano con questo nome già esistente' });
        }
        console.error('createPlan error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/plans/:id  (solo super_admin)
const updatePlan = async (req, res) => {
    try {
        const plan = await Plan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ error: 'Piano non trovato' });

        const allowed = [
            'name', 'max_assignments', 'max_users', 'storage_gb',
            'ai_quota', 'vigilance_module', 'ai_drafts_module', 'advanced_import', 'is_active'
        ];
        const updates = {};
        for (const field of allowed) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        await plan.update(updates);
        return res.json(plan);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Piano con questo nome già esistente' });
        }
        console.error('updatePlan error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listPlans, getPlan, createPlan, updatePlan };
